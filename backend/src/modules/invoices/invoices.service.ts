import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { InvoiceStatus, Prisma } from '../../generated/prisma/client';
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
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly invoicesBotClient: InvoicesBotClient,
  ) {}

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

    return this.executeInvoiceBotRun(draftInvoice, {
      attempts: draftInvoice.attempts + 1,
      reasonOnSuccess: 'success',
      reasonOnFailure: 'failed',
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

    if (invoice.status !== InvoiceStatus.FAILED) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'not-retryable',
        invoice,
        errorCode: 'INVOICE_NOT_RETRYABLE',
        errorMessage: 'Retry is available only for FAILED invoices.',
      });
    }

    return this.executeInvoiceBotRun(invoice, {
      attempts: invoice.attempts + 1,
      reasonOnSuccess: 'success',
      reasonOnFailure: 'failed',
    });
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
      attempts: number;
      reasonOnSuccess: string;
      reasonOnFailure: string;
    },
  ) {
    const payload = buildInvoiceBotPayload(invoice);
    const queuedAt = new Date();

    const queuedInvoice = await this.invoicesRepository.updateInvoice(invoice.id, {
      status: InvoiceStatus.QUEUED,
      attempts: options.attempts,
      queuedAt,
      payloadSnapshot: payload as unknown as Prisma.InputJsonValue,
      lastErrorCode: '',
      lastErrorMessage: '',
      notes: 'Invoice queued for bot execution.',
    });

    const botResponse = await this.invoicesBotClient.executeInvoiceIntake(payload);
    const updatedInvoice = await this.applyBotResponse(queuedInvoice, botResponse);
    const success =
      botResponse.ok &&
      botResponse.status === INVOICE_STATUS_VALUES.EXECUTED;

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

  private async applyBotResponse(invoice: InvoiceRecord, botResponse: InvoiceBotResponse) {
    const success =
      botResponse.ok &&
      botResponse.status === INVOICE_STATUS_VALUES.EXECUTED;
    const executedAt = new Date();

    return this.invoicesRepository.updateInvoice(invoice.id, {
      status: success ? InvoiceStatus.EXECUTED : InvoiceStatus.FAILED,
      executionId: botResponse.executionId,
      executionDurationMs: Math.max(Math.round(botResponse.duration || 0), 0),
      screenshotPath: botResponse.screenshot || '',
      filledItemsSnapshot: Array.isArray(botResponse.filledItems)
        ? (botResponse.filledItems as Prisma.InputJsonValue)
        : ([] as Prisma.InputJsonValue),
      executedAt,
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
        executionId: invoice.executionId,
        lastExecutionId: invoice.executionId,
        screenshot: invoice.screenshotPath,
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
