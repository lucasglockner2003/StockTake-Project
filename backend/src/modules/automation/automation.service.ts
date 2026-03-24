import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  AutomationJobSource,
  AutomationJobStatus,
  Prisma,
  SupplierOrderHistoryStatus,
} from '../../generated/prisma/client';
import {
  CreateAutomationJobDto,
  CreateAutomationJobItemDto,
  CreateAutomationJobMetadataDto,
} from './dto/create-automation-job.dto';
import { RunAutomationJobDto } from './dto/run-automation-job.dto';
import { UpdateAutomationJobErrorDto } from './dto/update-automation-job-error.dto';
import { UpdateAutomationJobNotesDto } from './dto/update-automation-job-notes.dto';
import { UpdateAutomationJobStatusDto } from './dto/update-automation-job-status.dto';
import {
  AutomationJobRecord,
  AutomationRepository,
  SupplierOrderHistoryRecord,
} from './automation.repository';
import {
  AutomationJobDeleteResponse,
  AutomationJobMutationResponse,
  AutomationJobResponse,
  AutomationJobsResetResponse,
  AutomationJobsSummaryResponse,
  AUTOMATION_JOB_SOURCE_VALUES,
  AUTOMATION_JOB_STATUS_VALUES,
  createEmptyAutomationSummary,
  mapApiAutomationJobSourceToPrisma,
  mapApiAutomationJobStatusToPrisma,
  mapAutomationJobSourceToApi,
  mapAutomationJobStatusToApi,
  mapSupplierOrderHistoryStatusToApi,
  SupplierOrderHistoryResetResponse,
  SupplierOrderHistoryResponse,
  SUPPLIER_ORDER_HISTORY_STATUS_VALUES,
  SupplierOrderMetadataResponse,
  SupplierOrderSnapshotResponse,
} from './automation.types';

type NormalizedAutomationJobItem = {
  sequence: number;
  itemId: number | null;
  itemName: string;
  quantity: number;
  source: AutomationJobSource;
  supplier: string;
  currentStock: number | null;
  idealStock: number | null;
  orderAmount: number | null;
  status: string;
  area: string;
  unit: string;
  rawLine: string;
};

type SupplierSnapshotItem = {
  name: string;
  quantity: number;
  unit: string;
};

type SupplierSnapshot = {
  supplier: string;
  items: SupplierSnapshotItem[];
  totalQuantity: number;
  timestamp: string;
  revisionNumber: number;
};

type SupplierMetadataSnapshot = {
  supplier: string;
  itemCount: number;
  totalQuantity: number;
  status: string;
  attempts: number;
  revisionNumber: number;
  snapshot: SupplierSnapshot;
  sentAt: string;
  lastSentAt: string;
};

type AutomationMetadataSnapshot = {
  supplierOrder: SupplierMetadataSnapshot | null;
};

function normalizeString(value: unknown, fallback = '') {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue || fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeNullableNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeInteger(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(Math.round(numericValue), 0);
}

function normalizePositiveInteger(value: unknown, fallback = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(Math.round(numericValue), 1);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDateOrNull(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function mapAutomationJobStatusToSupplierHistoryStatus(
  status: AutomationJobStatus,
): SupplierOrderHistoryStatus {
  if (status === AutomationJobStatus.DONE) {
    return SupplierOrderHistoryStatus.EXECUTED;
  }

  if (status === AutomationJobStatus.FAILED) {
    return SupplierOrderHistoryStatus.FAILED;
  }

  if (status === AutomationJobStatus.PENDING) {
    return SupplierOrderHistoryStatus.SENT_TO_QUEUE;
  }

  return SupplierOrderHistoryStatus.SENT_TO_QUEUE;
}

function buildSummary(
  counts: Array<{
    status: AutomationJobStatus;
    count: number;
  }>,
): AutomationJobsSummaryResponse {
  const summary = createEmptyAutomationSummary();

  counts.forEach((entry) => {
    summary.total += entry.count;

    if (entry.status === AutomationJobStatus.PENDING) {
      summary.pending = entry.count;
      return;
    }

    if (entry.status === AutomationJobStatus.RUNNING) {
      summary.running = entry.count;
      return;
    }

    if (entry.status === AutomationJobStatus.DONE) {
      summary.done = entry.count;
      return;
    }

    if (entry.status === AutomationJobStatus.FAILED) {
      summary.failed = entry.count;
    }
  });

  return summary;
}

function getSupplierFromItems(items: NormalizedAutomationJobItem[]) {
  return normalizeString(items.find((item) => item.supplier)?.supplier);
}

function normalizeSnapshotItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isObjectRecord(item)) {
        return null;
      }

      const name = normalizeString(item.name);
      const quantity = Math.max(normalizeNumber(item.quantity), 0);

      if (!name || quantity <= 0) {
        return null;
      }

      return {
        name,
        quantity,
        unit: normalizeString(item.unit),
      };
    })
    .filter((item): item is SupplierSnapshotItem => item !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildSupplierSnapshotFromItems(
  supplier: string,
  items: Array<{
    itemName: string;
    quantity: number;
    unit: string;
  }>,
  revisionNumber: number,
  timestamp: string,
): SupplierSnapshot {
  const snapshotItems = items
    .map((item) => ({
      name: normalizeString(item.itemName),
      quantity: Math.max(normalizeNumber(item.quantity), 0),
      unit: normalizeString(item.unit),
    }))
    .filter((item) => item.name && item.quantity > 0)
    .sort((left, right) => left.name.localeCompare(right.name));

  const totalQuantity = snapshotItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  return {
    supplier,
    items: snapshotItems,
    totalQuantity,
    timestamp,
    revisionNumber,
  };
}

function getSnapshotSignature(snapshot: SupplierSnapshot) {
  const supplier = normalizeString(snapshot.supplier).toLowerCase();
  const itemsSignature = snapshot.items
    .map((item) => `${item.name.toLowerCase()}|${item.quantity}|${item.unit}`)
    .join(';');

  return `${supplier}::${itemsSignature}`;
}

function normalizeSnapshotFromUnknown(
  value: unknown,
  supplier: string,
  fallbackItems: NormalizedAutomationJobItem[],
  revisionNumber: number,
  timestamp: string,
): SupplierSnapshot {
  if (!isObjectRecord(value)) {
    return buildSupplierSnapshotFromItems(
      supplier,
      fallbackItems.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
      })),
      revisionNumber,
      timestamp,
    );
  }

  const snapshotItems = normalizeSnapshotItems(value.items);
  const nextTimestamp = normalizeString(value.timestamp, timestamp);
  const nextRevisionNumber = normalizePositiveInteger(
    value.revisionNumber,
    revisionNumber,
  );
  const totalQuantity =
    snapshotItems.length > 0
      ? snapshotItems.reduce((sum, item) => sum + item.quantity, 0)
      : Math.max(normalizeNumber(value.totalQuantity), 0);

  return {
    supplier: normalizeString(value.supplier, supplier),
    items:
      snapshotItems.length > 0
        ? snapshotItems
        : buildSupplierSnapshotFromItems(
            supplier,
            fallbackItems.map((item) => ({
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
            })),
            nextRevisionNumber,
            nextTimestamp,
          ).items,
    totalQuantity,
    timestamp: nextTimestamp,
    revisionNumber: nextRevisionNumber,
  };
}

function normalizeCreateItems(
  items: CreateAutomationJobItemDto[],
  fallbackSource: AutomationJobSource,
): NormalizedAutomationJobItem[] {
  return (items || [])
    .map((item) => ({
      sequence: normalizePositiveInteger(item.sequence, 1),
      itemId:
        item.itemId === undefined || item.itemId === null
          ? null
          : normalizeInteger(item.itemId, 0),
      itemName: normalizeString(item.itemName),
      quantity: Math.max(normalizeNumber(item.quantity), 0),
      source: item.source
        ? mapApiAutomationJobSourceToPrisma(item.source)
        : fallbackSource,
      supplier: normalizeString(item.supplier),
      currentStock: normalizeNullableNumber(item.currentStock),
      idealStock: normalizeNullableNumber(item.idealStock),
      orderAmount: normalizeNullableNumber(item.orderAmount),
      status: normalizeString(item.status),
      area: normalizeString(item.area),
      unit: normalizeString(item.unit),
      rawLine: normalizeString(item.rawLine),
    }))
    .filter((item) => item.itemName && item.quantity >= 0)
    .sort((left, right) => left.sequence - right.sequence);
}

function normalizeMetadataSnapshot(
  metadata: CreateAutomationJobMetadataDto | undefined,
  source: AutomationJobSource,
  items: NormalizedAutomationJobItem[],
  attempts: number,
  jobStatus: AutomationJobStatus,
  timestamp: string,
): AutomationMetadataSnapshot {
  const supplierOrderInput = metadata?.supplierOrder;
  const isSupplierOrder =
    source === AutomationJobSource.REVIEW_SUPPLIER_ORDER || Boolean(supplierOrderInput);

  if (!isSupplierOrder) {
    return {
      supplierOrder: null,
    };
  }

  const supplier = normalizeString(
    supplierOrderInput?.supplier,
    getSupplierFromItems(items),
  );
  const revisionNumber = normalizePositiveInteger(
    supplierOrderInput?.revisionNumber,
    1,
  );
  const snapshot = normalizeSnapshotFromUnknown(
    supplierOrderInput?.snapshot,
    supplier,
    items,
    revisionNumber,
    normalizeString(
      supplierOrderInput?.lastSentAt || supplierOrderInput?.sentAt,
      timestamp,
    ),
  );
  const totalQuantity =
    supplierOrderInput?.totalQuantity !== undefined
      ? Math.max(normalizeNumber(supplierOrderInput.totalQuantity), 0)
      : snapshot.totalQuantity;
  const itemCount =
    supplierOrderInput?.itemCount !== undefined
      ? Math.max(normalizeInteger(supplierOrderInput.itemCount), 0)
      : snapshot.items.length;

  return {
    supplierOrder: {
      supplier,
      itemCount,
      totalQuantity,
      status:
        supplierOrderInput?.status ||
        mapSupplierOrderHistoryStatusToApi(
          mapAutomationJobStatusToSupplierHistoryStatus(jobStatus),
        ),
      attempts:
        supplierOrderInput?.attempts !== undefined
          ? Math.max(normalizeInteger(supplierOrderInput.attempts), 0)
          : attempts,
      revisionNumber: snapshot.revisionNumber,
      snapshot,
      sentAt: normalizeString(supplierOrderInput?.sentAt, snapshot.timestamp),
      lastSentAt: normalizeString(
        supplierOrderInput?.lastSentAt,
        supplierOrderInput?.sentAt || snapshot.timestamp,
      ),
    },
  };
}

function readMetadataSnapshot(value: Prisma.JsonValue | null | undefined) {
  if (!isObjectRecord(value)) {
    return {
      supplierOrder: null,
    } satisfies AutomationMetadataSnapshot;
  }

  const supplierOrderValue = isObjectRecord(value.supplierOrder)
    ? value.supplierOrder
    : null;

  if (!supplierOrderValue) {
    return {
      supplierOrder: null,
    } satisfies AutomationMetadataSnapshot;
  }

  const snapshot = normalizeSnapshotFromUnknown(
    supplierOrderValue.snapshot,
    normalizeString(supplierOrderValue.supplier),
    [],
    normalizePositiveInteger(supplierOrderValue.revisionNumber, 1),
    normalizeString(supplierOrderValue.lastSentAt || supplierOrderValue.sentAt),
  );

  return {
    supplierOrder: {
      supplier: normalizeString(supplierOrderValue.supplier, snapshot.supplier),
      itemCount: Math.max(normalizeInteger(supplierOrderValue.itemCount), 0),
      totalQuantity: Math.max(
        normalizeNumber(supplierOrderValue.totalQuantity, snapshot.totalQuantity),
        0,
      ),
      status: normalizeString(
        supplierOrderValue.status,
        SUPPLIER_ORDER_HISTORY_STATUS_VALUES.SENT_TO_QUEUE,
      ),
      attempts: Math.max(normalizeInteger(supplierOrderValue.attempts), 0),
      revisionNumber: snapshot.revisionNumber,
      snapshot,
      sentAt: normalizeString(supplierOrderValue.sentAt, snapshot.timestamp),
      lastSentAt: normalizeString(
        supplierOrderValue.lastSentAt,
        normalizeString(supplierOrderValue.sentAt, snapshot.timestamp),
      ),
    },
  } satisfies AutomationMetadataSnapshot;
}

function isSupplierOrderJob(job: AutomationJobRecord) {
  const metadata = readMetadataSnapshot(job.metadataSnapshot);
  return (
    job.source === AutomationJobSource.REVIEW_SUPPLIER_ORDER ||
    Boolean(metadata.supplierOrder)
  );
}

@Injectable()
export class AutomationService {
  constructor(private readonly automationRepository: AutomationRepository) {}

  async listJobs(): Promise<AutomationJobResponse[]> {
    const jobs = await this.automationRepository.listJobs();
    return jobs.map((job) => this.mapJobRecord(job));
  }

  async getJobsSummary(): Promise<AutomationJobsSummaryResponse> {
    return this.buildSummary();
  }

  async createJob(
    createAutomationJobDto: CreateAutomationJobDto,
  ): Promise<AutomationJobMutationResponse> {
    const source = createAutomationJobDto.source
      ? mapApiAutomationJobSourceToPrisma(createAutomationJobDto.source)
      : AutomationJobSource.UNKNOWN;
    const items = normalizeCreateItems(createAutomationJobDto.items || [], source);

    if (items.length === 0) {
      throw new BadRequestException('Add at least one valid automation item.');
    }

    const sessionId = normalizeString(
      createAutomationJobDto.sessionId,
      String(Date.now()),
    );
    const status = AutomationJobStatus.PENDING;
    const attempts = Math.max(
      normalizeInteger(createAutomationJobDto.attemptCount),
      0,
    );
    const timestamp = new Date().toISOString();
    const metadataSnapshot = normalizeMetadataSnapshot(
      createAutomationJobDto.metadata,
      source,
      items,
      attempts,
      status,
      timestamp,
    );

    const createdJob = await this.automationRepository.createJob({
      sessionId,
      source,
      status,
      notes: normalizeString(createAutomationJobDto.notes),
      attempts,
      totalItems: items.length,
      metadataSnapshot: metadataSnapshot as unknown as Prisma.InputJsonValue,
      lastErrorCode: '',
      lastErrorMessage: normalizeString(createAutomationJobDto.lastError),
      items: {
        create: items.map((item) => ({
          sequence: item.sequence,
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          source: item.source,
          supplier: item.supplier,
          currentStock: item.currentStock,
          idealStock: item.idealStock,
          orderAmount: item.orderAmount,
          status: item.status,
          area: item.area,
          unit: item.unit,
          rawLine: item.rawLine,
        })),
      },
    });

    const syncedJob = await this.syncSupplierOrderHistory(createdJob);

    return this.buildMutationResponse({
      ok: true,
      reason: 'created',
      job: syncedJob,
    });
  }

  async updateJobStatus(
    jobId: string,
    updateAutomationJobStatusDto: UpdateAutomationJobStatusDto,
  ): Promise<AutomationJobMutationResponse> {
    const currentJob = await this.getJobOrThrow(jobId);
    const nextStatus = mapApiAutomationJobStatusToPrisma(
      updateAutomationJobStatusDto.status,
    );

    const updatedJob = await this.automationRepository.updateJob(jobId, {
      status: nextStatus,
      attempts: updateAutomationJobStatusDto.incrementAttempts
        ? currentJob.attempts + 1
        : currentJob.attempts,
      lastErrorCode:
        nextStatus === AutomationJobStatus.FAILED ? currentJob.lastErrorCode : '',
      lastErrorMessage:
        nextStatus === AutomationJobStatus.FAILED ? currentJob.lastErrorMessage : '',
      runStartedAt:
        nextStatus === AutomationJobStatus.RUNNING
          ? currentJob.runStartedAt || new Date()
          : currentJob.runStartedAt,
      runFinishedAt:
        nextStatus === AutomationJobStatus.DONE || nextStatus === AutomationJobStatus.FAILED
          ? new Date()
          : nextStatus === AutomationJobStatus.PENDING
            ? null
            : currentJob.runFinishedAt,
      runDurationMs:
        nextStatus === AutomationJobStatus.DONE || nextStatus === AutomationJobStatus.FAILED
          ? currentJob.runStartedAt
            ? Math.max(new Date().getTime() - currentJob.runStartedAt.getTime(), 0)
            : currentJob.runDurationMs
          : nextStatus === AutomationJobStatus.PENDING
            ? null
            : currentJob.runDurationMs,
    });
    const syncedJob = await this.syncSupplierOrderHistory(updatedJob);

    return this.buildMutationResponse({
      ok: true,
      reason: 'updated',
      job: syncedJob,
    });
  }

  async updateJobError(
    jobId: string,
    updateAutomationJobErrorDto: UpdateAutomationJobErrorDto,
  ): Promise<AutomationJobMutationResponse> {
    await this.getJobOrThrow(jobId);

    const updatedJob = await this.automationRepository.updateJob(jobId, {
      status: AutomationJobStatus.FAILED,
      lastErrorCode: normalizeString(
        updateAutomationJobErrorDto.code,
        'AUTOMATION_JOB_ERROR',
      ),
      lastErrorMessage: normalizeString(
        updateAutomationJobErrorDto.message,
        'Automation job failed.',
      ),
      runFinishedAt: new Date(),
      runDurationMs: undefined,
    });
    const syncedJob = await this.syncSupplierOrderHistory(updatedJob);

    return this.buildMutationResponse({
      ok: true,
      reason: 'error-updated',
      job: syncedJob,
    });
  }

  async updateJobNotes(
    jobId: string,
    updateAutomationJobNotesDto: UpdateAutomationJobNotesDto,
  ): Promise<AutomationJobMutationResponse> {
    await this.getJobOrThrow(jobId);

    const updatedJob = await this.automationRepository.updateJob(jobId, {
      notes: normalizeString(updateAutomationJobNotesDto.notes),
    });
    const syncedJob = await this.syncSupplierOrderHistory(updatedJob);

    return this.buildMutationResponse({
      ok: true,
      reason: 'notes-updated',
      job: syncedJob,
    });
  }

  async resetJob(jobId: string): Promise<AutomationJobMutationResponse> {
    const currentJob = await this.getJobOrThrow(jobId);

    const updatedJob = await this.automationRepository.updateJob(jobId, {
      status: AutomationJobStatus.PENDING,
      lastErrorCode: '',
      lastErrorMessage: '',
      runStartedAt: null,
      runFinishedAt: null,
      runDurationMs: null,
      notes: currentJob.notes,
    });
    const syncedJob = await this.syncSupplierOrderHistory(updatedJob);

    return this.buildMutationResponse({
      ok: true,
      reason: 'reset',
      job: syncedJob,
    });
  }

  async deleteJob(jobId: string): Promise<AutomationJobDeleteResponse> {
    await this.getJobOrThrow(jobId);
    await this.automationRepository.deleteJob(jobId);

    return {
      ok: true,
      deletedId: jobId,
      summary: await this.buildSummary(),
      reason: 'deleted',
      errorCode: '',
      errorMessage: '',
    };
  }

  async deleteAllJobs(): Promise<AutomationJobsResetResponse> {
    const deletedCount = await this.automationRepository.deleteAllJobs();

    return {
      ok: true,
      deletedCount,
      summary: createEmptyAutomationSummary(),
      reason: 'reset',
      errorCode: '',
      errorMessage: '',
    };
  }

  async runJob(
    jobId: string,
    runAutomationJobDto: RunAutomationJobDto,
  ): Promise<AutomationJobMutationResponse> {
    const currentJob = await this.getJobOrThrow(jobId);

    if (currentJob.status === AutomationJobStatus.RUNNING) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'already-running',
        job: currentJob,
        errorCode: 'JOB_ALREADY_RUNNING',
        errorMessage: 'This automation job is already running.',
      });
    }

    const runStartedAt = new Date();

    await this.automationRepository.updateJob(jobId, {
      status: AutomationJobStatus.RUNNING,
      attempts: currentJob.attempts + 1,
      runStartedAt,
      runFinishedAt: null,
      runDurationMs: null,
      lastErrorCode: '',
      lastErrorMessage: '',
    });

    const shouldFail = Boolean(runAutomationJobDto.shouldFail);
    const runFinishedAt = new Date();
    const runDurationMs = Math.max(
      runFinishedAt.getTime() - runStartedAt.getTime(),
      0,
    );
    const updatedJob = await this.automationRepository.updateJob(jobId, {
      status: shouldFail ? AutomationJobStatus.FAILED : AutomationJobStatus.DONE,
      runStartedAt,
      runFinishedAt,
      runDurationMs,
      lastErrorCode: shouldFail ? 'AUTOMATION_RUN_FAILED' : '',
      lastErrorMessage: shouldFail
        ? normalizeString(
            runAutomationJobDto.failureMessage,
            'Simulated automation failure.',
          )
        : '',
      notes: shouldFail
        ? currentJob.notes
        : currentJob.notes || 'Automation job completed successfully.',
    });
    const syncedJob = await this.syncSupplierOrderHistory(updatedJob);
    const success = !shouldFail;

    return this.buildMutationResponse({
      ok: success,
      reason: success ? 'success' : 'failed',
      job: syncedJob,
      errorCode: success ? '' : 'AUTOMATION_RUN_FAILED',
      errorMessage: success
        ? ''
        : normalizeString(
            runAutomationJobDto.failureMessage,
            'Simulated automation failure.',
          ),
    });
  }

  async listSupplierOrderHistory(): Promise<SupplierOrderHistoryResponse[]> {
    const history = await this.automationRepository.listSupplierOrderHistory();
    return history.map((entry) => this.mapSupplierOrderHistoryRecord(entry));
  }

  async clearSupplierOrderHistory(): Promise<SupplierOrderHistoryResetResponse> {
    const deletedCount = await this.automationRepository.clearSupplierOrderHistory();

    return {
      ok: true,
      deletedCount,
    };
  }

  private async getJobOrThrow(jobId: string) {
    const job = await this.automationRepository.findJobById(jobId);

    if (!job) {
      throw new NotFoundException('Automation job was not found.');
    }

    return job;
  }

  private async buildSummary() {
    const counts = await this.automationRepository.getSummaryCounts();
    return buildSummary(counts);
  }

  private async buildMutationResponse({
    ok,
    reason,
    job,
    errorCode = '',
    errorMessage = '',
  }: {
    ok: boolean;
    reason: string;
    job: AutomationJobRecord | null;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<AutomationJobMutationResponse> {
    return {
      ok,
      reason,
      job: job ? this.mapJobRecord(job) : null,
      summary: await this.buildSummary(),
      errorCode,
      errorMessage,
    };
  }

  private async syncSupplierOrderHistory(job: AutomationJobRecord) {
    if (!isSupplierOrderJob(job)) {
      return job;
    }

    const metadataSnapshot = readMetadataSnapshot(job.metadataSnapshot);
    const supplier = normalizeString(
      metadataSnapshot.supplierOrder?.supplier,
      normalizeString(job.items[0]?.supplier),
    );

    if (!supplier) {
      return job;
    }

    const existingHistory =
      job.supplierHistory ||
      (await this.automationRepository.findSupplierOrderHistoryByJobId(job.id));
    const revisionNumber =
      existingHistory?.revisionNumber ||
      normalizePositiveInteger(
        metadataSnapshot.supplierOrder?.revisionNumber,
        0,
      ) ||
      (await this.automationRepository.getLatestSupplierRevisionNumber(supplier)) + 1;
    const snapshot = normalizeSnapshotFromUnknown(
      metadataSnapshot.supplierOrder?.snapshot,
      supplier,
      job.items.map((item) => ({
        sequence: item.sequence,
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        source: item.source,
        supplier: item.supplier,
        currentStock: item.currentStock,
        idealStock: item.idealStock,
        orderAmount: item.orderAmount,
        status: item.status,
        area: item.area,
        unit: item.unit,
        rawLine: item.rawLine,
      })),
      revisionNumber,
      normalizeString(
        metadataSnapshot.supplierOrder?.lastSentAt,
        job.updatedAt.toISOString(),
      ),
    );
    const syncedHistory = await this.automationRepository.upsertSupplierOrderHistoryByJobId(
      job.id,
      {
        supplier,
        totalQuantity: snapshot.totalQuantity,
        status: mapAutomationJobStatusToSupplierHistoryStatus(job.status),
        attempts: job.attempts,
        revisionNumber: snapshot.revisionNumber,
        snapshotTimestamp: toDateOrNull(snapshot.timestamp) || new Date(job.updatedAt),
        snapshotSignature: getSnapshotSignature(snapshot),
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    );

    return this.automationRepository.findJobById(syncedHistory.automationJobId);
  }

  private mapJobRecord(job: AutomationJobRecord): AutomationJobResponse {
    const metadataSnapshot = readMetadataSnapshot(job.metadataSnapshot);
    const supplierOrderMetadata = this.buildSupplierOrderMetadata(job, metadataSnapshot);

    return {
      jobId: job.id,
      sessionId: job.sessionId,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      status: mapAutomationJobStatusToApi(job.status),
      source: mapAutomationJobSourceToApi(job.source),
      notes: job.notes,
      attemptCount: job.attempts,
      lastError: job.lastErrorMessage,
      totalItems: job.totalItems,
      items: job.items.map((item) => ({
        sequence: item.sequence,
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        source: mapAutomationJobSourceToApi(item.source),
        supplier: item.supplier,
        currentStock: item.currentStock,
        idealStock: item.idealStock,
        orderAmount: item.orderAmount,
        status: item.status,
        area: item.area,
        unit: item.unit,
        rawLine: item.rawLine,
      })),
      metadata: {
        supplierOrder: supplierOrderMetadata,
      },
      executionMetadata: {
        runStartedAt: toIsoString(job.runStartedAt),
        runFinishedAt: toIsoString(job.runFinishedAt),
        runDuration: job.runDurationMs,
        lastErrorCode: job.lastErrorCode,
        lastErrorMessage: job.lastErrorMessage,
      },
    };
  }

  private buildSupplierOrderMetadata(
    job: AutomationJobRecord,
    metadataSnapshot: AutomationMetadataSnapshot,
  ): SupplierOrderMetadataResponse | null {
    if (!isSupplierOrderJob(job)) {
      return null;
    }

    const snapshot = job.supplierHistory
      ? normalizeSnapshotFromUnknown(
          job.supplierHistory.snapshot,
          job.supplierHistory.supplier,
          job.items.map((item) => ({
            sequence: item.sequence,
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: item.quantity,
            source: item.source,
            supplier: item.supplier,
            currentStock: item.currentStock,
            idealStock: item.idealStock,
            orderAmount: item.orderAmount,
            status: item.status,
            area: item.area,
            unit: item.unit,
            rawLine: item.rawLine,
          })),
          job.supplierHistory.revisionNumber,
          job.supplierHistory.snapshotTimestamp.toISOString(),
        )
      : metadataSnapshot.supplierOrder?.snapshot ||
        buildSupplierSnapshotFromItems(
          normalizeString(metadataSnapshot.supplierOrder?.supplier),
          job.items.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
          })),
          normalizePositiveInteger(metadataSnapshot.supplierOrder?.revisionNumber, 1),
          job.updatedAt.toISOString(),
        );

    if (!snapshot) {
      return null;
    }

    return {
      supplier: job.supplierHistory?.supplier || metadataSnapshot.supplierOrder?.supplier || '',
      itemCount:
        metadataSnapshot.supplierOrder?.itemCount ||
        snapshot.items.length ||
        job.items.length,
      totalQuantity: job.supplierHistory?.totalQuantity || snapshot.totalQuantity,
      status: mapSupplierOrderHistoryStatusToApi(
        job.supplierHistory?.status ||
          mapAutomationJobStatusToSupplierHistoryStatus(job.status),
      ),
      attempts: job.supplierHistory?.attempts || job.attempts,
      revisionNumber:
        job.supplierHistory?.revisionNumber || snapshot.revisionNumber || 1,
      snapshot,
      sentAt:
        metadataSnapshot.supplierOrder?.sentAt ||
        snapshot.timestamp ||
        job.createdAt.toISOString(),
      lastSentAt:
        metadataSnapshot.supplierOrder?.lastSentAt ||
        snapshot.timestamp ||
        job.updatedAt.toISOString(),
    };
  }

  private mapSupplierOrderHistoryRecord(
    history: SupplierOrderHistoryRecord,
  ): SupplierOrderHistoryResponse {
    const snapshot = normalizeSnapshotFromUnknown(
      history.snapshot,
      history.supplier,
      history.automationJob.items.map((item) => ({
        sequence: item.sequence,
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        source: item.source,
        supplier: item.supplier,
        currentStock: item.currentStock,
        idealStock: item.idealStock,
        orderAmount: item.orderAmount,
        status: item.status,
        area: item.area,
        unit: item.unit,
        rawLine: item.rawLine,
      })),
      history.revisionNumber,
      history.snapshotTimestamp.toISOString(),
    );

    return {
      id: history.id,
      jobId: history.automationJobId,
      supplier: history.supplier,
      items: snapshot.items,
      totalQuantity: history.totalQuantity,
      timestamp: history.updatedAt.toISOString(),
      snapshotTimestamp: history.snapshotTimestamp.toISOString(),
      revisionNumber: history.revisionNumber,
      snapshot,
      status: mapSupplierOrderHistoryStatusToApi(history.status),
      attempts: history.attempts,
    };
  }
}
