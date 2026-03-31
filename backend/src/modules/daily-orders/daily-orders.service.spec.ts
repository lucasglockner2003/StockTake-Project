import assert from 'node:assert/strict';

import { ExecutionIdempotencyRepository } from '../../common/idempotency/execution-idempotency.repository';
import {
  DailyOrderSource,
  DailyOrderStatus,
} from '../../generated/prisma/client';
import { SupplierHistoryService } from '../supplier-orders/supplier-history.service';
import {
  DailyOrdersBotClient,
  DailyOrdersBotResponse,
} from './daily-orders-bot.client';
import {
  DailyOrderRecord,
  DailyOrdersRepository,
} from './daily-orders.repository';
import { DailyOrdersService } from './daily-orders.service';

class FakeDailyOrdersRepository {
  private order: DailyOrderRecord;

  constructor(order: DailyOrderRecord) {
    this.order = structuredClone(order);
  }

  async findDailyOrderById(orderId: string) {
    if (orderId !== this.order.id) {
      return null;
    }

    return structuredClone(this.order);
  }

  async findFirstFillingOrder(excludeOrderId?: string) {
    if (
      this.order.status !== DailyOrderStatus.FILLING_ORDER ||
      this.order.id === excludeOrderId
    ) {
      return null;
    }

    return structuredClone(this.order);
  }

  async findStaleFillingOrders(cutoff: Date) {
    if (
      this.order.status !== DailyOrderStatus.FILLING_ORDER ||
      !this.order.executionStartedAt ||
      this.order.executionStartedAt.getTime() >= cutoff.getTime()
    ) {
      return [];
    }

    return [structuredClone(this.order)];
  }

  async updateDailyOrder(orderId: string, data: Record<string, unknown>) {
    assert.equal(orderId, this.order.id);

    const nextOrder = structuredClone(this.order) as Record<string, unknown>;

    Object.entries(data).forEach(([key, value]) => {
      nextOrder[key] = value;
    });

    nextOrder.updatedAt = new Date(this.order.updatedAt.getTime() + 1000);
    this.order = nextOrder as DailyOrderRecord;

    return structuredClone(this.order);
  }

  async markFillingOrderAsTimedOut(
    orderId: string,
    cutoff: Date,
    data: Record<string, unknown>,
  ) {
    if (
      orderId !== this.order.id ||
      this.order.status !== DailyOrderStatus.FILLING_ORDER ||
      !this.order.executionStartedAt ||
      this.order.executionStartedAt.getTime() >= cutoff.getTime()
    ) {
      return { count: 0 };
    }

    await this.updateDailyOrder(orderId, data);
    return { count: 1 };
  }

  async getSummaryCounts() {
    return [
      {
        status: this.order.status,
        count: 1,
      },
    ];
  }
}

class FakeDailyOrdersBotClient {
  readonly fillCalls: unknown[] = [];
  readonly submitCalls: unknown[] = [];

  constructor(
    private readonly options: {
      fillResponder?: () => Promise<DailyOrdersBotResponse>;
      submitResponder?: () => Promise<DailyOrdersBotResponse>;
    },
  ) {}

  async executeFill(payload: unknown) {
    this.fillCalls.push(structuredClone(payload));
    return this.options.fillResponder?.() as Promise<DailyOrdersBotResponse>;
  }

  async submitFinal(payload: unknown) {
    this.submitCalls.push(structuredClone(payload));
    return this.options.submitResponder?.() as Promise<DailyOrdersBotResponse>;
  }
}

class FakeSupplierHistoryService {
  async syncFromDailyOrder() {
    return null;
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

function createDailyOrderRecord(
  overrides: Partial<DailyOrderRecord> = {},
): DailyOrderRecord {
  return {
    id: 'daily-order-1',
    supplier: 'Bidfood',
    source: DailyOrderSource.SUGGESTED_ORDER,
    status: DailyOrderStatus.READY_TO_EXECUTE,
    isLocked: true,
    totalQuantity: 2,
    attempts: 0,
    readyAt: new Date('2026-03-31T00:00:00.000Z'),
    executionStartedAt: null,
    executionFinishedAt: null,
    executionDurationMs: null,
    filledAt: null,
    readyForReviewAt: null,
    executionNotes: '',
    reviewScreenshotPath: '',
    chefApprovedAt: null,
    submittedAt: null,
    submitStartedAt: null,
    submitFinishedAt: null,
    submitDurationMs: null,
    finalExecutionNotes: '',
    finalScreenshotPath: '',
    orderNumber: '',
    lastExecutionId: '',
    lastExecutionPhase: '',
    lastErrorCode: '',
    lastErrorMessage: '',
    createdAt: new Date('2026-03-31T00:00:00.000Z'),
    updatedAt: new Date('2026-03-31T00:00:00.000Z'),
    items: [
      {
        id: 'daily-order-item-1',
        dailyOrderId: 'daily-order-1',
        itemIndex: 0,
        itemId: 1001,
        itemName: 'Tomatoes',
        quantity: 2,
        unit: 'kg',
        createdAt: new Date('2026-03-31T00:00:00.000Z'),
        updatedAt: new Date('2026-03-31T00:00:00.000Z'),
      },
    ],
    ...overrides,
  };
}

function createService(
  repository: FakeDailyOrdersRepository,
  botClient: FakeDailyOrdersBotClient,
) {
  const supplierHistoryService = new FakeSupplierHistoryService();
  const executionIdempotencyRepository = new FakeExecutionIdempotencyRepository();

  return new DailyOrdersService(
    repository as unknown as DailyOrdersRepository,
    botClient as unknown as DailyOrdersBotClient,
    supplierHistoryService as unknown as SupplierHistoryService,
    executionIdempotencyRepository as unknown as ExecutionIdempotencyRepository,
  );
}

async function reusesDailyOrderFillByIdempotencyKey() {
  const repository = new FakeDailyOrdersRepository(createDailyOrderRecord());
  const botClient = new FakeDailyOrdersBotClient({
    fillResponder: async () => ({
      ok: true,
      status: 'ready-for-chef-review',
      executionId: 'fill-exec-1',
      phase: 'fill-completed',
      errorCode: '',
      message: '',
      executionDuration: 120,
      executionStartedAt: '2026-03-31T00:00:00.000Z',
      executionFinishedAt: '2026-03-31T00:00:02.000Z',
      filledAt: '2026-03-31T00:00:02.000Z',
      readyForReviewAt: '2026-03-31T00:00:02.000Z',
      executionNotes: 'Fill completed.',
      reviewScreenshot: '/artifacts/review-1.png',
      orderNumber: '',
      finalScreenshot: '',
      submitStartedAt: '',
      submittedAt: '',
      submitFinishedAt: '',
      submitDuration: 0,
      finalExecutionNotes: '',
    }),
  });
  const service = createService(repository, botClient);

  const firstResponse = await service.runDailyOrderBotFill(
    'daily-order-1',
    'fill-key-1',
  );
  const secondResponse = await service.runDailyOrderBotFill(
    'daily-order-1',
    'fill-key-1',
  );

  assert.equal(botClient.fillCalls.length, 1);
  assert.deepEqual(secondResponse, firstResponse);
}

async function reusesDailyOrderFinalSubmitByIdempotencyKey() {
  const repository = new FakeDailyOrdersRepository(
    createDailyOrderRecord({
      status: DailyOrderStatus.READY_FOR_CHEF_REVIEW,
      attempts: 1,
      filledAt: new Date('2026-03-31T00:00:02.000Z'),
      readyForReviewAt: new Date('2026-03-31T00:00:02.000Z'),
      reviewScreenshotPath: '/artifacts/review-1.png',
      lastExecutionId: 'fill-exec-1',
      lastExecutionPhase: 'fill-completed',
      executionNotes: 'Fill completed.',
    }),
  );
  const botClient = new FakeDailyOrdersBotClient({
    submitResponder: async () => ({
      ok: true,
      status: 'executed',
      executionId: 'submit-exec-1',
      phase: 'final-submit-completed',
      errorCode: '',
      message: '',
      executionDuration: 0,
      executionStartedAt: '',
      executionFinishedAt: '',
      filledAt: '',
      readyForReviewAt: '',
      executionNotes: '',
      reviewScreenshot: '',
      orderNumber: 'PO-1001',
      finalScreenshot: '/artifacts/final-1.png',
      submitStartedAt: '2026-03-31T00:00:05.000Z',
      submittedAt: '2026-03-31T00:00:08.000Z',
      submitFinishedAt: '2026-03-31T00:00:08.000Z',
      submitDuration: 180,
      finalExecutionNotes: 'Final submit completed.',
    }),
  });
  const service = createService(repository, botClient);

  const firstResponse = await service.finalSubmitDailyOrder(
    'daily-order-1',
    'submit-key-1',
  );
  const secondResponse = await service.finalSubmitDailyOrder(
    'daily-order-1',
    'submit-key-1',
  );

  assert.equal(botClient.submitCalls.length, 1);
  assert.deepEqual(secondResponse, firstResponse);
}

async function recoversStaleDailyOrderExecutionAsFailed() {
  const repository = new FakeDailyOrdersRepository(
    createDailyOrderRecord({
      status: DailyOrderStatus.FILLING_ORDER,
      executionStartedAt: new Date('2026-03-31T00:00:00.000Z'),
      executionNotes: 'Bot service started fill on supplier portal.',
      lastExecutionPhase: 'fill-started',
    }),
  );
  const botClient = new FakeDailyOrdersBotClient({});
  const service = createService(repository, botClient);

  const originalDateNow = Date.now;
  Date.now = () => new Date('2026-03-31T00:06:00.000Z').getTime();

  try {
    await (
      service as unknown as {
        recoverStaleFillingOrders: () => Promise<void>;
      }
    ).recoverStaleFillingOrders();
  } finally {
    Date.now = originalDateNow;
  }

  const recoveredOrder = await repository.findDailyOrderById('daily-order-1');

  assert.equal(recoveredOrder?.status, DailyOrderStatus.FAILED);
  assert.equal(recoveredOrder?.lastErrorCode, 'TIMEOUT');
  assert.equal(recoveredOrder?.lastErrorMessage, 'Execution timeout exceeded');
  assert.equal(recoveredOrder?.executionNotes, 'Execution timeout exceeded');
}

export async function runDailyOrdersServiceIdempotencyTests() {
  const testCases = [
    {
      name: 'reuses daily-order fill by idempotency key',
      run: reusesDailyOrderFillByIdempotencyKey,
    },
    {
      name: 'reuses daily-order final submit by idempotency key',
      run: reusesDailyOrderFinalSubmitByIdempotencyKey,
    },
    {
      name: 'recovers stale daily-order execution as failed',
      run: recoversStaleDailyOrderExecutionAsFailed,
    },
  ];

  for (const testCase of testCases) {
    await testCase.run();
    process.stdout.write(`PASS ${testCase.name}\n`);
  }
}

if (require.main === module) {
  runDailyOrdersServiceIdempotencyTests().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
