import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';

import { ExecutionIdempotencyRepository } from '../../common/idempotency/execution-idempotency.repository';
import { InvoiceStatus } from '../../generated/prisma/client';
import {
  InvoiceBotPayload,
  InvoiceBotResponse,
  InvoicesBotClient,
} from './invoices-bot.client';
import { InvoiceRecord, InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';

class ConcurrentReadBarrier<T> {
  private readonly waiters: Array<{
    resolve: (value: T) => void;
    snapshot: T;
  }> = [];

  constructor(private readonly requiredCount: number) {}

  wait(snapshot: T) {
    return new Promise<T>((resolve) => {
      this.waiters.push({
        resolve,
        snapshot,
      });

      if (this.waiters.length < this.requiredCount) {
        return;
      }

      const readyWaiters = this.waiters.splice(0, this.waiters.length);
      readyWaiters.forEach((waiter) => {
        waiter.resolve(waiter.snapshot);
      });
    });
  }
}

class FakeInvoicesRepository {
  private invoice: InvoiceRecord;
  private readonly readBarrier?: ConcurrentReadBarrier<InvoiceRecord>;
  private findCalls = 0;

  constructor(invoice: InvoiceRecord, options?: { readBarrier?: ConcurrentReadBarrier<InvoiceRecord> }) {
    this.invoice = structuredClone(invoice);
    this.readBarrier = options?.readBarrier;
  }

  get currentInvoice() {
    return structuredClone(this.invoice);
  }

  async findInvoiceById(invoiceId: string) {
    if (invoiceId !== this.invoice.id) {
      return null;
    }

    const snapshot = structuredClone(this.invoice);
    this.findCalls += 1;

    if (this.readBarrier && this.findCalls <= 2) {
      return this.readBarrier.wait(snapshot);
    }

    return snapshot;
  }

  async findNextQueuedInvoiceForExecution() {
    if (this.invoice.status !== InvoiceStatus.QUEUED) {
      return null;
    }

    return structuredClone(this.invoice);
  }

  async findStaleProcessingInvoices(cutoff: Date) {
    if (
      this.invoice.status !== InvoiceStatus.PROCESSING ||
      !this.invoice.executionStartedAt ||
      this.invoice.executionStartedAt.getTime() >= cutoff.getTime()
    ) {
      return [];
    }

    return [structuredClone(this.invoice)];
  }

  async acquireInvoiceExecutionLock(invoiceId: string, data: Record<string, unknown>) {
    if (invoiceId !== this.invoice.id) {
      return null;
    }

    if (
      this.invoice.status !== InvoiceStatus.QUEUED &&
      this.invoice.status !== InvoiceStatus.FAILED
    ) {
      return null;
    }

    this.applyUpdate(data);
    return structuredClone(this.invoice);
  }

  async updateInvoice(invoiceId: string, data: Record<string, unknown>) {
    assert.equal(invoiceId, this.invoice.id);
    this.applyUpdate(data);
    return structuredClone(this.invoice);
  }

  async markProcessingInvoiceAsTimedOut(
    invoiceId: string,
    cutoff: Date,
    data: Record<string, unknown>,
  ) {
    if (
      invoiceId !== this.invoice.id ||
      this.invoice.status !== InvoiceStatus.PROCESSING ||
      !this.invoice.executionStartedAt ||
      this.invoice.executionStartedAt.getTime() >= cutoff.getTime()
    ) {
      return { count: 0 };
    }

    this.applyUpdate(data);
    return { count: 1 };
  }

  async getSummaryCounts() {
    return [
      {
        status: this.invoice.status,
        count: 1,
      },
    ];
  }

  private applyUpdate(data: Record<string, unknown>) {
    const nextInvoice = structuredClone(this.invoice) as Record<string, unknown>;

    Object.entries(data).forEach(([key, value]) => {
      nextInvoice[key] = value;
    });

    nextInvoice.updatedAt = new Date('2026-03-31T00:00:10.000Z');
    this.invoice = nextInvoice as InvoiceRecord;
  }
}

class FakeQueueInvoicesRepository {
  private invoices: InvoiceRecord[];

  constructor(invoices: InvoiceRecord[]) {
    this.invoices = structuredClone(invoices);
  }

  get currentInvoices() {
    return structuredClone(this.invoices);
  }

  async findInvoiceById(invoiceId: string) {
    const invoice = this.invoices.find((entry) => entry.id === invoiceId);
    return invoice ? structuredClone(invoice) : null;
  }

  async findNextQueuedInvoiceForExecution() {
    const nextQueuedInvoice = this.invoices
      .filter((invoice) => invoice.status === InvoiceStatus.QUEUED)
      .sort((left, right) => {
        const createdAtDelta = left.createdAt.getTime() - right.createdAt.getTime();

        if (createdAtDelta !== 0) {
          return createdAtDelta;
        }

        return left.id.localeCompare(right.id);
      })[0];

    return nextQueuedInvoice ? structuredClone(nextQueuedInvoice) : null;
  }

  async findStaleProcessingInvoices(cutoff: Date) {
    return this.invoices
      .filter(
        (invoice) =>
          invoice.status === InvoiceStatus.PROCESSING &&
          invoice.executionStartedAt instanceof Date &&
          invoice.executionStartedAt.getTime() < cutoff.getTime(),
      )
      .sort((left, right) => {
        const leftStartedAt = left.executionStartedAt?.getTime() || 0;
        const rightStartedAt = right.executionStartedAt?.getTime() || 0;

        if (leftStartedAt !== rightStartedAt) {
          return leftStartedAt - rightStartedAt;
        }

        return left.id.localeCompare(right.id);
      })
      .map((invoice) => structuredClone(invoice));
  }

  async acquireInvoiceExecutionLock(invoiceId: string, data: Record<string, unknown>) {
    const invoice = this.invoices.find((entry) => entry.id === invoiceId);

    if (!invoice) {
      return null;
    }

    if (
      invoice.status !== InvoiceStatus.QUEUED &&
      invoice.status !== InvoiceStatus.FAILED
    ) {
      return null;
    }

    this.applyUpdate(invoiceId, data);
    return this.findInvoiceById(invoiceId);
  }

  async updateInvoice(invoiceId: string, data: Record<string, unknown>) {
    this.applyUpdate(invoiceId, data);
    return this.findInvoiceById(invoiceId);
  }

  async markProcessingInvoiceAsTimedOut(
    invoiceId: string,
    cutoff: Date,
    data: Record<string, unknown>,
  ) {
    const invoice = this.invoices.find((entry) => entry.id === invoiceId);

    if (
      !invoice ||
      invoice.status !== InvoiceStatus.PROCESSING ||
      !invoice.executionStartedAt ||
      invoice.executionStartedAt.getTime() >= cutoff.getTime()
    ) {
      return { count: 0 };
    }

    this.applyUpdate(invoiceId, data);
    return { count: 1 };
  }

  async getSummaryCounts() {
    const counts = new Map<InvoiceStatus, number>();

    this.invoices.forEach((invoice) => {
      counts.set(invoice.status, (counts.get(invoice.status) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
    }));
  }

  async countInvoicesByStatus(status: InvoiceStatus) {
    return this.invoices.filter((invoice) => invoice.status === status).length;
  }

  private applyUpdate(invoiceId: string, data: Record<string, unknown>) {
    const invoiceIndex = this.invoices.findIndex((entry) => entry.id === invoiceId);

    assert.notEqual(invoiceIndex, -1);

    const nextInvoice = structuredClone(this.invoices[invoiceIndex]) as Record<
      string,
      unknown
    >;

    Object.entries(data).forEach(([key, value]) => {
      nextInvoice[key] = value;
    });

    nextInvoice.updatedAt = new Date(
      this.invoices[invoiceIndex].updatedAt.getTime() + 1000,
    );
    this.invoices[invoiceIndex] = nextInvoice as InvoiceRecord;
  }
}

class FakeInvoicesBotClient {
  readonly calls: InvoiceBotPayload[] = [];

  constructor(
    private readonly responder: (payload: InvoiceBotPayload) => Promise<InvoiceBotResponse>,
  ) {}

  async executeInvoiceIntake(payload: InvoiceBotPayload) {
    this.calls.push(structuredClone(payload));
    return this.responder(payload);
  }
}

class FakeExecutionIdempotencyRepository {
  private readonly records = new Map<
    string,
    {
      id: string;
      operation: string;
      entityId: string;
      idempotencyKey: string;
      isFinal: boolean;
      status: string;
      executionId: string;
      screenshotPath: string;
      reviewScreenshotPath: string;
      finalScreenshotPath: string;
      errorCode: string;
      errorMessage: string;
      responseSnapshot: unknown;
    }
  >();

  private nextId = 1;

  async findByKey(operation: string, entityId: string, idempotencyKey: string) {
    return (
      this.records.get(`${operation}:${entityId}:${idempotencyKey}`) || null
    );
  }

  async createPending(operation: string, entityId: string, idempotencyKey: string) {
    const existingRecord = await this.findByKey(operation, entityId, idempotencyKey);

    if (existingRecord) {
      return {
        created: false,
        record: structuredClone(existingRecord),
      };
    }

    const record = {
      id: `idempotency-${this.nextId++}`,
      operation,
      entityId,
      idempotencyKey,
      isFinal: false,
      status: '',
      executionId: '',
      screenshotPath: '',
      reviewScreenshotPath: '',
      finalScreenshotPath: '',
      errorCode: '',
      errorMessage: '',
      responseSnapshot: null,
    };

    this.records.set(`${operation}:${entityId}:${idempotencyKey}`, record);

    return {
      created: true,
      record: structuredClone(record),
    };
  }

  async updateById(id: string, data: Record<string, unknown>) {
    const entry = Array.from(this.records.values()).find((record) => record.id === id);

    assert.ok(entry, 'Expected idempotency record to exist.');

    Object.entries(data).forEach(([key, value]) => {
      (entry as Record<string, unknown>)[key] = value;
    });

    return structuredClone(entry);
  }

  async deleteById(id: string) {
    const entry = Array.from(this.records.entries()).find(([, record]) => record.id === id);

    if (!entry) {
      return null;
    }

    this.records.delete(entry[0]);
    return structuredClone(entry[1]);
  }
}

function createInvoiceRecord(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: 'invoice-1',
    supplier: 'Bidfood',
    invoiceNumber: 'INV-001',
    invoiceDate: '2026-03-31',
    totalAmount: 5.5,
    status: InvoiceStatus.QUEUED,
    attempts: 0,
    payloadSnapshot: null,
    filledItemsSnapshot: null,
    screenshotPath: '',
    executionId: '',
    executionDurationMs: null,
    queuedAt: new Date('2026-03-31T00:00:00.000Z'),
    executionStartedAt: null,
    executedAt: null,
    lastErrorCode: '',
    lastErrorMessage: '',
    notes: '',
    createdAt: new Date('2026-03-31T00:00:00.000Z'),
    updatedAt: new Date('2026-03-31T00:00:00.000Z'),
    items: [
      {
        id: 'item-1',
        invoiceId: 'invoice-1',
        itemIndex: 0,
        itemName: 'Tomatoes',
        quantity: 1,
        unitPrice: 5.5,
        lineTotal: 5.5,
        createdAt: new Date('2026-03-31T00:00:00.000Z'),
        updatedAt: new Date('2026-03-31T00:00:00.000Z'),
      },
    ],
    ...overrides,
  };
}

function createQueuedInvoiceRecords(total: number) {
  return Array.from({ length: total }, (_, index) =>
    createInvoiceRecord({
      id: `invoice-${index + 1}`,
      invoiceNumber: `INV-${String(index + 1).padStart(3, '0')}`,
      createdAt: new Date(`2026-03-31T00:00:${String(index).padStart(2, '0')}.000Z`),
      updatedAt: new Date(`2026-03-31T00:00:${String(index).padStart(2, '0')}.000Z`),
      queuedAt: new Date(`2026-03-31T00:00:${String(index).padStart(2, '0')}.000Z`),
      status: InvoiceStatus.QUEUED,
      attempts: 0,
      executionStartedAt: null,
      executedAt: null,
      executionId: '',
      lastErrorCode: '',
      lastErrorMessage: '',
      notes: 'Invoice queued for bot execution.',
      items: [
        {
          id: `item-${index + 1}`,
          invoiceId: `invoice-${index + 1}`,
          itemIndex: 0,
          itemName: `Item ${index + 1}`,
          quantity: 1,
          unitPrice: 5.5,
          lineTotal: 5.5,
          createdAt: new Date(`2026-03-31T00:00:${String(index).padStart(2, '0')}.000Z`),
          updatedAt: new Date(`2026-03-31T00:00:${String(index).padStart(2, '0')}.000Z`),
        },
      ],
    }),
  );
}

function createService(
  repository: FakeInvoicesRepository,
  botClient: FakeInvoicesBotClient,
) {
  const executionIdempotencyRepository = new FakeExecutionIdempotencyRepository();

  return new InvoicesService(
    repository as unknown as InvoicesRepository,
    botClient as unknown as InvoicesBotClient,
    executionIdempotencyRepository as unknown as ExecutionIdempotencyRepository,
  );
}

function assertConflict(error: unknown) {
  assert.ok(error instanceof ConflictException);
  assert.equal(error.getStatus(), 409);

  const response = error.getResponse() as Record<string, unknown>;
  assert.equal(response.reason, 'already_processing_or_executed');
}

async function expectConflict(promiseFactory: () => Promise<unknown>) {
  try {
    await promiseFactory();
    assert.fail('Expected request to fail with ConflictException.');
  } catch (error) {
    assertConflict(error);
  }
}

async function blocksDuplicateConcurrentExecution() {
  const readBarrier = new ConcurrentReadBarrier<InvoiceRecord>(2);
  const repository = new FakeInvoicesRepository(createInvoiceRecord(), {
    readBarrier,
  });
  const botClient = new FakeInvoicesBotClient(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));

    return {
      ok: true,
      status: 'executed',
      executionId: 'exec-1',
      phase: 'invoice-completed',
      errorCode: '',
      message: '',
      duration: 120,
      screenshot: '/artifacts/invoice-1.png',
      filledItems: [{ itemName: 'Tomatoes', quantity: 1 }],
      notes: 'Invoice execution completed successfully.',
    };
  });
  const service = createService(repository, botClient);

  const results = await Promise.allSettled([
    service.executeInvoice('invoice-1'),
    service.executeInvoice('invoice-1'),
  ]);

  const fulfilledResults = results.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<InvoicesService['executeInvoice']>>> =>
      result.status === 'fulfilled',
  );
  const rejectedResults = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  assert.equal(fulfilledResults.length, 1);
  assert.equal(rejectedResults.length, 1);
  assertConflict(rejectedResults[0].reason);

  const successResponse = fulfilledResults[0].value;

  assert.equal(successResponse.ok, true);
  assert.equal(successResponse.invoice?.status, 'executed');
  assert.equal(successResponse.invoice?.attempts, 1);
  assert.equal(successResponse.invoice?.executionMetadata.executionId, 'exec-1');
  assert.equal(botClient.calls.length, 1);

  const persistedInvoice = repository.currentInvoice;
  assert.equal(persistedInvoice.attempts, 1);
  assert.equal(persistedInvoice.status, InvoiceStatus.EXECUTED);
  assert.equal(persistedInvoice.executionId, 'exec-1');
  assert.ok(persistedInvoice.executionStartedAt instanceof Date);
}

async function returnsConflictForExecutedInvoice() {
  const repository = new FakeInvoicesRepository(
    createInvoiceRecord({
      status: InvoiceStatus.EXECUTED,
      attempts: 1,
      executionId: 'exec-existing',
      executedAt: new Date('2026-03-31T00:01:00.000Z'),
    }),
  );
  const botClient = new FakeInvoicesBotClient(async () => {
    throw new Error('Bot should not run for executed invoices.');
  });
  const service = createService(repository, botClient);

  await expectConflict(() => service.executeInvoice('invoice-1'));
  assert.equal(botClient.calls.length, 0);
  assert.equal(repository.currentInvoice.attempts, 1);
  assert.equal(repository.currentInvoice.executionId, 'exec-existing');
}

async function returnsConflictForProcessingInvoice() {
  const repository = new FakeInvoicesRepository(
    createInvoiceRecord({
      status: InvoiceStatus.PROCESSING,
      attempts: 1,
      executionStartedAt: new Date('2026-03-31T00:00:30.000Z'),
    }),
  );
  const botClient = new FakeInvoicesBotClient(async () => {
    throw new Error('Bot should not run for processing invoices.');
  });
  const service = createService(repository, botClient);

  await expectConflict(() => service.executeInvoice('invoice-1'));
  assert.equal(botClient.calls.length, 0);
  assert.equal(repository.currentInvoice.attempts, 1);
  assert.equal(repository.currentInvoice.executionId, '');
}

async function waitFor(
  predicate: () => boolean,
  options?: {
    timeoutMs?: number;
    stepMs?: number;
    message?: string;
  },
) {
  const timeoutMs = options?.timeoutMs ?? 1000;
  const stepMs = options?.stepMs ?? 10;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }

  assert.fail(options?.message ?? 'Timed out waiting for condition.');
}

async function drainsQueuedInvoicesInCreationOrderAfterOneManualExecution() {
  const repository = new FakeQueueInvoicesRepository(createQueuedInvoiceRecords(10));
  const botClient = new FakeInvoicesBotClient(async (payload) => {
    await new Promise((resolve) => setTimeout(resolve, 5));

    return {
      ok: true,
      status: 'executed',
      executionId: `exec-${payload.invoiceId}`,
      phase: 'invoice-completed',
      errorCode: '',
      message: '',
      duration: 50,
      screenshot: `/artifacts/${payload.invoiceId}.png`,
      filledItems: payload.items,
      notes: `Executed ${payload.invoiceId}.`,
    };
  });
  const service = createService(
    repository as unknown as FakeInvoicesRepository,
    botClient,
  );

  const firstExecution = await service.executeInvoice('invoice-1');

  assert.equal(firstExecution.ok, true);
  assert.equal(firstExecution.invoice?.status, 'executed');
  assert.equal(firstExecution.invoice?.attempts, 1);

  await waitFor(
    () =>
      repository.currentInvoices.every(
        (invoice) => invoice.status === InvoiceStatus.EXECUTED,
      ),
    {
      timeoutMs: 2000,
      message: 'Expected queued invoices to be drained automatically.',
    },
  );

  const executionOrder = botClient.calls.map((payload) => payload.invoiceId);
  assert.deepEqual(executionOrder, [
    'invoice-1',
    'invoice-2',
    'invoice-3',
    'invoice-4',
    'invoice-5',
    'invoice-6',
    'invoice-7',
    'invoice-8',
    'invoice-9',
    'invoice-10',
  ]);

  repository.currentInvoices.forEach((invoice, index) => {
    assert.equal(invoice.status, InvoiceStatus.EXECUTED);
    assert.equal(invoice.attempts, 1);
    assert.equal(invoice.executionId, `exec-invoice-${index + 1}`);
  });

  assert.equal(await repository.countInvoicesByStatus(InvoiceStatus.QUEUED), 0);
}

async function recoversStaleProcessingInvoicesAsFailed() {
  const repository = new FakeInvoicesRepository(
    createInvoiceRecord({
      status: InvoiceStatus.PROCESSING,
      attempts: 1,
      executionStartedAt: new Date('2026-03-31T00:00:00.000Z'),
      lastErrorCode: '',
      lastErrorMessage: '',
      notes: 'Invoice execution started.',
    }),
  );
  const botClient = new FakeInvoicesBotClient(async () => {
    throw new Error('Bot should not run during recovery.');
  });
  const service = createService(repository, botClient);

  const originalDateNow = Date.now;
  Date.now = () => new Date('2026-03-31T00:06:00.000Z').getTime();

  try {
    await (
      service as unknown as {
        recoverStaleProcessingInvoices: () => Promise<void>;
      }
    ).recoverStaleProcessingInvoices();
  } finally {
    Date.now = originalDateNow;
  }

  assert.equal(botClient.calls.length, 0);
  assert.equal(repository.currentInvoice.status, InvoiceStatus.FAILED);
  assert.equal(repository.currentInvoice.lastErrorCode, 'TIMEOUT');
  assert.equal(
    repository.currentInvoice.lastErrorMessage,
    'Execution timeout exceeded',
  );
  assert.equal(repository.currentInvoice.notes, 'Execution timeout exceeded');
  assert.equal(repository.currentInvoice.attempts, 1);
}

async function reusesInvoiceExecutionByIdempotencyKey() {
  const repository = new FakeInvoicesRepository(createInvoiceRecord());
  const botClient = new FakeInvoicesBotClient(async () => ({
    ok: true,
    status: 'executed',
    executionId: 'exec-idempotent-1',
    phase: 'invoice-completed',
    errorCode: '',
    message: '',
    duration: 140,
    screenshot: '/artifacts/invoice-idempotent-1.png',
    filledItems: [{ itemName: 'Tomatoes', quantity: 1 }],
    notes: 'Invoice execution completed successfully.',
  }));
  const service = createService(repository, botClient);

  const firstResponse = await service.executeInvoice('invoice-1', 'invoice-key-1');
  const secondResponse = await service.executeInvoice('invoice-1', 'invoice-key-1');

  assert.equal(botClient.calls.length, 1);
  assert.deepEqual(secondResponse, firstResponse);
}

export async function runInvoicesServiceConcurrencyTests() {
  const testCases = [
    {
      name: 'blocks duplicate concurrent execution of the same invoice',
      run: blocksDuplicateConcurrentExecution,
    },
    {
      name: 'returns 409 when the invoice is already executed',
      run: returnsConflictForExecutedInvoice,
    },
    {
      name: 'returns 409 when the invoice is already processing',
      run: returnsConflictForProcessingInvoice,
    },
    {
      name: 'drains queued invoices in creation order after one manual execution',
      run: drainsQueuedInvoicesInCreationOrderAfterOneManualExecution,
    },
    {
      name: 'recovers stale processing invoices as failed',
      run: recoversStaleProcessingInvoicesAsFailed,
    },
    {
      name: 'reuses invoice execution by idempotency key',
      run: reusesInvoiceExecutionByIdempotencyKey,
    },
  ];

  for (const testCase of testCases) {
    await testCase.run();
    process.stdout.write(`PASS ${testCase.name}\n`);
  }
}

if (require.main === module) {
  runInvoicesServiceConcurrencyTests().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
