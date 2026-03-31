import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  ExecutionIdempotencyRecord,
  ExecutionIdempotencyRepository,
} from '../../common/idempotency/execution-idempotency.repository';
import { normalizePublicBotArtifactUrl } from '../../common/utils/bot-artifact-url';
import { resolveBotServiceBaseUrl } from '../../config/bot-service.config';
import {
  ExecutionIdempotencyOperation,
  InvoiceStatus,
  Prisma,
} from '../../generated/prisma/client';
import { CreateInvoiceIntakeDto } from './dto/create-invoice-intake.dto';
import {
  InvoiceBotPayload,
  InvoiceBotResponse,
  InvoicesBotClient,
} from './invoices-bot.client';
import { InvoiceRecord, InvoicesRepository } from './invoices.repository';
import {
  createEmptyInvoiceSummary,
  InvoiceDeleteResponse,
  InvoiceMutationResponse,
  InvoiceResponse,
  InvoiceSummaryResponse,
  INVOICE_STATUS_VALUES,
  mapInvoiceStatusToApi,
} from './invoices.types';

type NormalizedInvoiceItemInput = {
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type NormalizedInvoiceDraft = {
  supplier: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: NormalizedInvoiceItemInput[];
  totalAmount: number;
};

const BOT_SERVICE_BASE_URL = resolveBotServiceBaseUrl(
  process.env.BOT_SERVICE_BASE_URL,
  process.env.NODE_ENV,
);
const INVOICE_RECOVERY_INTERVAL_MS = 60_000;
const INVOICE_PROCESSING_TIMEOUT_MS = 5 * 60_000;
const INVOICE_RECOVERY_ERROR_CODE = 'TIMEOUT';
const INVOICE_RECOVERY_ERROR_MESSAGE = 'Execution timeout exceeded';
const IDEMPOTENCY_WAIT_INTERVAL_MS = 250;
const IDEMPOTENCY_WAIT_TIMEOUT_MS = 35_000;

function normalizeString(value: string | undefined, fallback = '') {
  const normalizedValue = String(value || '').trim();
  return normalizedValue || fallback;
}

function normalizeNumber(value: number | string | undefined) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(numericValue, 0);
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : '';
}

function normalizeIdempotencyKey(value: string | undefined) {
  const normalizedValue = String(value || '').trim();
  return normalizedValue || '';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canExecuteInvoiceStatus(status: InvoiceStatus) {
  return status === InvoiceStatus.QUEUED || status === InvoiceStatus.FAILED;
}

function isInvoiceExecutionBlockedStatus(status: InvoiceStatus) {
  return status === InvoiceStatus.EXECUTED || status === InvoiceStatus.PROCESSING;
}

function buildInvoiceSummary(
  counts: Array<{
    status: InvoiceStatus;
    count: number;
  }>,
): InvoiceSummaryResponse {
  const summary = createEmptyInvoiceSummary();

  counts.forEach((entry) => {
    summary.total += entry.count;

    if (entry.status === InvoiceStatus.DRAFT) {
      summary.draft = entry.count;
      return;
    }

    if (entry.status === InvoiceStatus.QUEUED) {
      summary.queued = entry.count;
      return;
    }

    if (entry.status === InvoiceStatus.PROCESSING) {
      summary.processing = entry.count;
      return;
    }

    if (entry.status === InvoiceStatus.EXECUTED) {
      summary.executed = entry.count;
      return;
    }

    if (entry.status === InvoiceStatus.FAILED) {
      summary.failed = entry.count;
    }
  });

  return summary;
}

function normalizeFilledItemsSnapshot(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function normalizeInvoiceDraft(
  createInvoiceIntakeDto: CreateInvoiceIntakeDto,
): NormalizedInvoiceDraft {
  const items = (createInvoiceIntakeDto.items || [])
    .map((item) => {
      const itemName = normalizeString(item.itemName);
      const quantity = normalizeNumber(item.quantity);
      const unitPrice = normalizeNumber(item.unitPrice);
      const lineTotalInput = normalizeNumber(item.lineTotal);
      const lineTotal = lineTotalInput > 0 ? lineTotalInput : quantity * unitPrice;

      return {
        itemName,
        quantity,
        unitPrice,
        lineTotal: Number(lineTotal.toFixed(2)),
      };
    })
    .filter((item) => item.itemName && item.quantity > 0);

  const totalAmount = Number(
    items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
  );

  return {
    supplier: normalizeString(createInvoiceIntakeDto.supplier, 'Unknown Supplier'),
    invoiceNumber: normalizeString(createInvoiceIntakeDto.invoiceNumber),
    invoiceDate: normalizeString(createInvoiceIntakeDto.invoiceDate),
    items,
    totalAmount,
  };
}

function buildInvoiceBotPayload(invoice: InvoiceRecord): InvoiceBotPayload {
  const items = invoice.items.map((item) => ({
    sequence: item.itemIndex + 1,
    itemName: item.itemName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  }));

  return {
    invoiceId: invoice.id,
    supplier: invoice.supplier,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    totalAmount: invoice.totalAmount,
    totalItems: items.length,
    source: 'invoice-intake',
    createdAt: invoice.createdAt.toISOString(),
    items,
  };
}

@Injectable()
export class InvoicesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoicesService.name);
  private queueDrainPromise: Promise<void> | null = null;
  private recoveryIntervalHandle: NodeJS.Timeout | null = null;
  private isRecoveryRunning = false;

  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly invoicesBotClient: InvoicesBotClient,
    private readonly executionIdempotencyRepository: ExecutionIdempotencyRepository,
  ) {}

  onModuleInit() {
    if (this.recoveryIntervalHandle) {
      return;
    }

    this.recoveryIntervalHandle = setInterval(() => {
      void this.recoverStaleProcessingInvoices();
    }, INVOICE_RECOVERY_INTERVAL_MS);

    if (typeof this.recoveryIntervalHandle.unref === 'function') {
      this.recoveryIntervalHandle.unref();
    }
  }

  onModuleDestroy() {
    if (!this.recoveryIntervalHandle) {
      return;
    }

    clearInterval(this.recoveryIntervalHandle);
    this.recoveryIntervalHandle = null;
  }

  async intakeInvoice(
    createInvoiceIntakeDto: CreateInvoiceIntakeDto,
  ): Promise<InvoiceMutationResponse> {
    const normalizedInvoiceDraft = normalizeInvoiceDraft(createInvoiceIntakeDto);

    if (normalizedInvoiceDraft.items.length === 0) {
      throw new BadRequestException(
        'Add at least one valid invoice item before sending to bot.',
      );
    }

    const draftInvoice = await this.invoicesRepository.createInvoice({
      supplier: normalizedInvoiceDraft.supplier,
      invoiceNumber: normalizedInvoiceDraft.invoiceNumber,
      invoiceDate: normalizedInvoiceDraft.invoiceDate,
      totalAmount: normalizedInvoiceDraft.totalAmount,
      status: InvoiceStatus.DRAFT,
      notes: 'Invoice draft created.',
      items: {
        create: normalizedInvoiceDraft.items.map((item, itemIndex) => ({
          itemIndex,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      },
    });

    const queuedInvoice = await this.queueInvoiceForExecution(draftInvoice, {
      notes: 'Invoice queued for bot execution.',
    });

    return this.buildMutationResponse({
      ok: true,
      reason: 'queued',
      invoice: queuedInvoice,
    });
  }

  async listInvoices(): Promise<InvoiceResponse[]> {
    const invoices = await this.invoicesRepository.listInvoices();
    return invoices.map((invoice) => this.mapInvoiceRecord(invoice));
  }

  async getInvoicesSummary(): Promise<InvoiceSummaryResponse> {
    return this.buildSummary();
  }

  async getInvoiceById(invoiceId: string): Promise<InvoiceResponse> {
    const invoice = await this.invoicesRepository.findInvoiceById(invoiceId);

    if (!invoice) {
      throw new NotFoundException('Invoice was not found.');
    }

    return this.mapInvoiceRecord(invoice);
  }

  async retryInvoice(invoiceId: string): Promise<InvoiceMutationResponse> {
    const invoice = await this.getInvoiceOrThrow(invoiceId);

    if (isInvoiceExecutionBlockedStatus(invoice.status)) {
      this.throwAlreadyProcessingOrExecutedConflict();
    }

    if (invoice.status !== InvoiceStatus.FAILED) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'not-retryable',
        invoice,
        errorCode: 'INVOICE_NOT_RETRYABLE',
        errorMessage: 'Retry is available only for FAILED invoices.',
      });
    }

    const processingInvoice = await this.acquireInvoiceExecutionLockOrThrow(invoice);

    return this.executeInvoiceBotRun(processingInvoice, {
      reasonOnSuccess: 'success',
      reasonOnFailure: 'failed',
    });
  }

  async executeInvoice(
    invoiceId: string,
    rawIdempotencyKey?: string,
  ): Promise<InvoiceMutationResponse> {
    const idempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);
    const reusedResponse = await this.tryReuseInvoiceExecution(
      invoiceId,
      idempotencyKey,
    );

    if (reusedResponse) {
      return reusedResponse;
    }

    const invoice = await this.getInvoiceOrThrow(invoiceId);

    if (isInvoiceExecutionBlockedStatus(invoice.status)) {
      this.throwAlreadyProcessingOrExecutedConflict();
    }

    if (!canExecuteInvoiceStatus(invoice.status)) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'not-executable',
        invoice,
        errorCode: 'INVOICE_NOT_EXECUTABLE',
        errorMessage: 'Only queued or failed invoices can be sent to the bot.',
      });
    }

    const pendingIdempotentExecution = await this.claimPendingInvoiceExecution(
      invoiceId,
      idempotencyKey,
    );

    if (pendingIdempotentExecution && !pendingIdempotentExecution.created) {
      this.logger.log(
        `[idempotency] Reusing previous execution for key=${idempotencyKey}`,
      );

      return this.awaitInvoiceIdempotentResponse(
        invoiceId,
        idempotencyKey,
        pendingIdempotentExecution.record,
      );
    }

    try {
      const processingInvoice = await this.acquireInvoiceExecutionLockOrThrow(invoice);
      const response = await this.executeInvoiceBotRun(processingInvoice, {
        reasonOnSuccess: 'success',
        reasonOnFailure: 'failed',
      });

      await this.persistInvoiceIdempotentResponse(
        pendingIdempotentExecution?.record.id || '',
        response,
      );

      return response;
    } catch (error) {
      await this.safeDeletePendingIdempotentExecution(
        pendingIdempotentExecution?.record.id || '',
      );
      throw error;
    }
  }

  async deleteInvoice(invoiceId: string): Promise<InvoiceDeleteResponse> {
    const invoice = await this.invoicesRepository.findInvoiceById(invoiceId);

    if (!invoice) {
      throw new NotFoundException('Invoice was not found.');
    }

    await this.invoicesRepository.deleteInvoice(invoiceId);

    return {
      ok: true,
      deletedId: invoiceId,
      summary: await this.buildSummary(),
      reason: 'deleted',
      errorCode: '',
      errorMessage: '',
    };
  }

  private async executeInvoiceBotRun(
    invoice: InvoiceRecord,
    options: {
      reasonOnSuccess: string;
      reasonOnFailure: string;
    },
  ) {
    const payload = buildInvoiceBotPayload(invoice);

    const botResponse = await this.invoicesBotClient.executeInvoiceIntake(payload);
    const updatedInvoice = await this.applyBotResponse(invoice, botResponse);
    const success =
      botResponse.ok &&
      botResponse.status === INVOICE_STATUS_VALUES.EXECUTED;
    this.scheduleQueueDrain();

    return this.buildMutationResponse({
      ok: success,
      reason: success ? options.reasonOnSuccess : options.reasonOnFailure,
      invoice: updatedInvoice,
      errorCode: success ? '' : botResponse.errorCode || 'INVOICE_EXECUTION_FAILED',
      errorMessage: success
        ? ''
        : botResponse.message || botResponse.notes || 'Invoice execution failed.',
    });
  }

  private scheduleQueueDrain() {
    if (this.queueDrainPromise) {
      return;
    }

    this.queueDrainPromise = this.drainQueuedInvoices()
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unexpected invoice queue drain error.';
        const stack = error instanceof Error ? error.stack : undefined;

        this.logger.error(`Invoice queue drain failed: ${message}`, stack);
      })
      .finally(() => {
        this.queueDrainPromise = null;
        void this.resumeQueueDrainIfNeeded();
      });
  }

  private async resumeQueueDrainIfNeeded() {
    if (this.queueDrainPromise) {
      return;
    }

    const nextQueuedInvoice =
      await this.invoicesRepository.findNextQueuedInvoiceForExecution();

    if (!nextQueuedInvoice) {
      return;
    }

    this.scheduleQueueDrain();
  }

  private async drainQueuedInvoices() {
    while (true) {
      const nextQueuedInvoice =
        await this.invoicesRepository.findNextQueuedInvoiceForExecution();

      if (!nextQueuedInvoice) {
        return;
      }

      const processingInvoice = await this.tryAcquireInvoiceExecutionLock(
        nextQueuedInvoice,
      );

      if (!processingInvoice) {
        continue;
      }

      await this.executeInvoiceBotRun(processingInvoice, {
        reasonOnSuccess: 'success',
        reasonOnFailure: 'failed',
      });
    }
  }

  private async recoverStaleProcessingInvoices() {
    if (this.isRecoveryRunning) {
      return;
    }

    this.isRecoveryRunning = true;

    try {
      const cutoff = new Date(Date.now() - INVOICE_PROCESSING_TIMEOUT_MS);
      const staleInvoices =
        await this.invoicesRepository.findStaleProcessingInvoices(cutoff);

      for (const invoice of staleInvoices) {
        const updateResult =
          await this.invoicesRepository.markProcessingInvoiceAsTimedOut(
            invoice.id,
            cutoff,
            {
              status: InvoiceStatus.FAILED,
              lastErrorCode: INVOICE_RECOVERY_ERROR_CODE,
              lastErrorMessage: INVOICE_RECOVERY_ERROR_MESSAGE,
              notes: INVOICE_RECOVERY_ERROR_MESSAGE,
            },
          );

        if (updateResult.count === 0) {
          continue;
        }

        this.logger.warn(
          `[recovery] invoice ${invoice.id} moved from PROCESSING → FAILED`,
        );
      }
    } finally {
      this.isRecoveryRunning = false;
    }
  }

  private async tryReuseInvoiceExecution(
    invoiceId: string,
    idempotencyKey: string,
  ): Promise<InvoiceMutationResponse | null> {
    if (!idempotencyKey) {
      return null;
    }

    const existingExecution = await this.executionIdempotencyRepository.findByKey(
      ExecutionIdempotencyOperation.INVOICE_EXECUTE,
      invoiceId,
      idempotencyKey,
    );

    if (!existingExecution) {
      return null;
    }

    this.logger.log(
      `[idempotency] Reusing previous execution for key=${idempotencyKey}`,
    );

    return this.awaitInvoiceIdempotentResponse(
      invoiceId,
      idempotencyKey,
      existingExecution,
    );
  }

  private claimPendingInvoiceExecution(
    invoiceId: string,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      return Promise.resolve(null);
    }

    return this.executionIdempotencyRepository.createPending(
      ExecutionIdempotencyOperation.INVOICE_EXECUTE,
      invoiceId,
      idempotencyKey,
    );
  }

  private async awaitInvoiceIdempotentResponse(
    invoiceId: string,
    idempotencyKey: string,
    existingExecution: ExecutionIdempotencyRecord,
  ): Promise<InvoiceMutationResponse> {
    let currentExecution = existingExecution;
    const deadline = Date.now() + IDEMPOTENCY_WAIT_TIMEOUT_MS;

    while (!currentExecution.isFinal && Date.now() < deadline) {
      await sleep(IDEMPOTENCY_WAIT_INTERVAL_MS);

      const refreshedExecution = await this.executionIdempotencyRepository.findByKey(
        ExecutionIdempotencyOperation.INVOICE_EXECUTE,
        invoiceId,
        idempotencyKey,
      );

      if (!refreshedExecution) {
        break;
      }

      currentExecution = refreshedExecution;
    }

    const persistedResponse = this.parseInvoiceIdempotentResponse(
      currentExecution.responseSnapshot,
    );

    if (currentExecution.isFinal && persistedResponse) {
      return persistedResponse;
    }

    const latestInvoice = await this.getInvoiceOrThrow(invoiceId);
    return this.buildMutationResponse({
      ok: latestInvoice.status === InvoiceStatus.EXECUTED,
      reason:
        latestInvoice.status === InvoiceStatus.EXECUTED
          ? 'success'
          : latestInvoice.status === InvoiceStatus.FAILED
            ? 'failed'
            : latestInvoice.status === InvoiceStatus.PROCESSING
              ? 'processing'
              : 'queued',
      invoice: latestInvoice,
      errorCode: latestInvoice.lastErrorCode,
      errorMessage: latestInvoice.lastErrorMessage,
    });
  }

  private parseInvoiceIdempotentResponse(
    value: Prisma.JsonValue | null | undefined,
  ): InvoiceMutationResponse | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as unknown as InvoiceMutationResponse;
  }

  private async persistInvoiceIdempotentResponse(
    idempotentExecutionId: string,
    response: InvoiceMutationResponse,
  ) {
    if (!idempotentExecutionId) {
      return;
    }

    try {
      await this.executionIdempotencyRepository.updateById(idempotentExecutionId, {
        isFinal: true,
        status: response.invoice?.status || response.reason,
        executionId:
          response.invoice?.executionMetadata.executionId || '',
        screenshotPath:
          response.invoice?.executionMetadata.screenshot || '',
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
        responseSnapshot: response as unknown as Prisma.InputJsonValue,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown idempotency persistence error.';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to persist invoice idempotent response: ${message}`,
        stack,
      );

      await this.safeDeletePendingIdempotentExecution(idempotentExecutionId);
    }
  }

  private async safeDeletePendingIdempotentExecution(idempotentExecutionId: string) {
    if (!idempotentExecutionId) {
      return;
    }

    try {
      await this.executionIdempotencyRepository.deleteById(idempotentExecutionId);
    } catch {
      // Ignore cleanup failures for idempotency placeholders.
    }
  }

  private async applyBotResponse(invoice: InvoiceRecord, botResponse: InvoiceBotResponse) {
    const success =
      botResponse.ok &&
      botResponse.status === INVOICE_STATUS_VALUES.EXECUTED;
    const executedAt = new Date();

    return this.invoicesRepository.updateInvoice(invoice.id, {
      status: success ? InvoiceStatus.EXECUTED : InvoiceStatus.FAILED,
      executionId: success ? botResponse.executionId : '',
      executionDurationMs: Math.max(Math.round(botResponse.duration || 0), 0),
      screenshotPath: normalizePublicBotArtifactUrl(
        BOT_SERVICE_BASE_URL,
        botResponse.screenshot,
      ),
      filledItemsSnapshot: Array.isArray(botResponse.filledItems)
        ? (botResponse.filledItems as Prisma.InputJsonValue)
        : ([] as Prisma.InputJsonValue),
      executedAt: success ? executedAt : null,
      lastErrorCode: success
        ? ''
        : botResponse.errorCode || 'INVOICE_EXECUTION_FAILED',
      lastErrorMessage: success
        ? ''
        : botResponse.message ||
          botResponse.notes ||
          'Invoice execution failed.',
      notes:
        botResponse.notes ||
        botResponse.message ||
        (success
          ? 'Invoice execution completed successfully.'
          : 'Invoice execution failed.'),
    });
  }

  private async acquireInvoiceExecutionLockOrThrow(invoice: InvoiceRecord) {
    const processingInvoice = await this.tryAcquireInvoiceExecutionLock(invoice);

    if (processingInvoice) {
      return processingInvoice;
    }

    const latestInvoice = await this.getInvoiceOrThrow(invoice.id);

    if (isInvoiceExecutionBlockedStatus(latestInvoice.status)) {
      this.throwAlreadyProcessingOrExecutedConflict();
    }

    throw new ConflictException({
      error: 'Conflict',
      message: 'Invoice execution lock could not be acquired.',
      reason: 'already_processing_or_executed',
    });
  }

  private tryAcquireInvoiceExecutionLock(invoice: InvoiceRecord) {
    const payload = buildInvoiceBotPayload(invoice);

    return this.invoicesRepository.acquireInvoiceExecutionLock(invoice.id, {
      status: InvoiceStatus.PROCESSING,
      attempts: invoice.attempts + 1,
      queuedAt: new Date(),
      executionStartedAt: new Date(),
      payloadSnapshot: payload as unknown as Prisma.InputJsonValue,
      filledItemsSnapshot: [] as Prisma.InputJsonValue,
      screenshotPath: '',
      executionId: '',
      executionDurationMs: null,
      executedAt: null,
      lastErrorCode: '',
      lastErrorMessage: '',
      notes: 'Invoice execution started.',
    });
  }

  private queueInvoiceForExecution(
    invoice: InvoiceRecord,
    options: {
      attempts?: number;
      notes: string;
    },
  ) {
    const payload = buildInvoiceBotPayload(invoice);

    return this.invoicesRepository.updateInvoice(invoice.id, {
      status: InvoiceStatus.QUEUED,
      attempts: options.attempts ?? invoice.attempts,
      queuedAt: new Date(),
      payloadSnapshot: payload as unknown as Prisma.InputJsonValue,
      lastErrorCode: '',
      lastErrorMessage: '',
      notes: options.notes,
    });
  }

  private throwAlreadyProcessingOrExecutedConflict(): never {
    throw new ConflictException({
      error: 'Conflict',
      message: 'Invoice is already processing or already executed.',
      reason: 'already_processing_or_executed',
    });
  }

  private async getInvoiceOrThrow(invoiceId: string) {
    const invoice = await this.invoicesRepository.findInvoiceById(invoiceId);

    if (!invoice) {
      throw new NotFoundException('Invoice was not found.');
    }

    return invoice;
  }

  private async buildSummary() {
    const counts = await this.invoicesRepository.getSummaryCounts();
    return buildInvoiceSummary(counts);
  }

  private async buildMutationResponse({
    ok,
    reason,
    invoice,
    errorCode = '',
    errorMessage = '',
  }: {
    ok: boolean;
    reason: string;
    invoice: InvoiceRecord | null;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<InvoiceMutationResponse> {
    return {
      ok,
      reason,
      invoice: invoice ? this.mapInvoiceRecord(invoice) : null,
      summary: await this.buildSummary(),
      errorCode,
      errorMessage,
    };
  }

  private mapInvoiceRecord(invoice: InvoiceRecord): InvoiceResponse {
    return {
      id: invoice.id,
      supplier: invoice.supplier,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      items: invoice.items.map((item) => ({
        itemIndex: item.itemIndex,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      totalAmount: invoice.totalAmount,
      status: mapInvoiceStatusToApi(invoice.status),
      attempts: invoice.attempts,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      executionMetadata: {
        lastQueuedAt: toIsoString(invoice.queuedAt),
        startedAt: toIsoString(invoice.executionStartedAt),
        executionId: invoice.executionId,
        lastExecutionId: invoice.executionId,
        screenshot: normalizePublicBotArtifactUrl(
          BOT_SERVICE_BASE_URL,
          invoice.screenshotPath,
        ),
        duration: invoice.executionDurationMs || 0,
        filledItems: normalizeFilledItemsSnapshot(invoice.filledItemsSnapshot),
        lastErrorCode: invoice.lastErrorCode,
        lastErrorMessage: invoice.lastErrorMessage,
        notes: invoice.notes,
        finishedAt: toIsoString(invoice.executedAt),
        lastPayload: invoice.payloadSnapshot,
      },
    };
  }
}
