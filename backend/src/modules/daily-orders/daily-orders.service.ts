import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { DailyOrderSource, DailyOrderStatus } from '../../generated/prisma/client';
import { SupplierHistoryService } from '../supplier-orders/supplier-history.service';
import { CreateDailyOrdersFromPhotoDto } from './dto/create-daily-orders-from-photo.dto';
import { CreateDailyOrdersFromSuggestedOrderDto } from './dto/create-daily-orders-from-suggested-order.dto';
import { UpdateDailyOrderItemDto } from './dto/update-daily-order-item.dto';
import {
  DailyOrdersBotClient,
  DailyOrdersBotResponse,
} from './daily-orders-bot.client';
import {
  DailyOrderRecord,
  DailyOrdersRepository,
} from './daily-orders.repository';
import {
  createEmptyDailyOrdersSummary,
  DAILY_ORDER_STATUS_VALUES,
  DailyOrderBotPayload,
  DailyOrderCreateInput,
  DailyOrdersBotServiceStatusResponse,
  DailyOrderMutationResponse,
  DailyOrderResponse,
  DailyOrdersCreateResponse,
  DailyOrdersResetResponse,
  DailyOrdersSummaryResponse,
  mapPrismaDailyOrderStatusToApi,
  UNKNOWN_SUPPLIER_LABEL,
} from './daily-orders.types';

function normalizeQuantity(value: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(numericValue, 0);
}

function normalizeText(value: string | undefined) {
  return String(value || '').trim();
}

function normalizeSupplier(value: string | undefined) {
  const supplier = normalizeText(value);
  return supplier || UNKNOWN_SUPPLIER_LABEL;
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

function toDurationOrNull(value: number | null | undefined) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(Math.round(numericValue), 0) : null;
}

function canExecuteStatus(status: DailyOrderStatus) {
  return (
    status === DailyOrderStatus.READY_TO_EXECUTE ||
    status === DailyOrderStatus.FAILED
  );
}

function canUnlockStatus(status: DailyOrderStatus) {
  return (
    status !== DailyOrderStatus.FILLING_ORDER &&
    status !== DailyOrderStatus.EXECUTED
  );
}

function buildDailyOrderBotPayload(order: DailyOrderRecord): DailyOrderBotPayload {
  return {
    supplier: normalizeSupplier(order.supplier),
    items: order.items
      .map((item) => ({
        itemName: normalizeText(item.itemName),
        quantity: normalizeQuantity(item.quantity),
        unit: normalizeText(item.unit),
      }))
      .filter((item) => item.itemName && item.quantity > 0),
  };
}

function mapSummaryCountsToResponse(
  counts: Array<{
    status: DailyOrderStatus;
    count: number;
  }>,
): DailyOrdersSummaryResponse {
  const summary = createEmptyDailyOrdersSummary();

  counts.forEach((entry) => {
    summary.total += entry.count;

    if (entry.status === DailyOrderStatus.DRAFT) {
      summary.draft = entry.count;
      return;
    }

    if (entry.status === DailyOrderStatus.READY_TO_EXECUTE) {
      summary.ready = entry.count;
      return;
    }

    if (entry.status === DailyOrderStatus.FILLING_ORDER) {
      summary.fillingOrder = entry.count;
      return;
    }

    if (entry.status === DailyOrderStatus.READY_FOR_CHEF_REVIEW) {
      summary.readyForChefReview = entry.count;
      return;
    }

    if (entry.status === DailyOrderStatus.EXECUTED) {
      summary.executed = entry.count;
      return;
    }

    if (entry.status === DailyOrderStatus.FAILED) {
      summary.failed = entry.count;
    }
  });

  return summary;
}

@Injectable()
export class DailyOrdersService {
  private readonly logger = new Logger(DailyOrdersService.name);

  constructor(
    private readonly dailyOrdersRepository: DailyOrdersRepository,
    private readonly dailyOrdersBotClient: DailyOrdersBotClient,
    private readonly supplierHistoryService: SupplierHistoryService,
  ) {}

  async listDailyOrders(): Promise<DailyOrderResponse[]> {
    const dailyOrders = await this.dailyOrdersRepository.listDailyOrders();
    return dailyOrders.map((dailyOrder) => this.mapDailyOrderRecord(dailyOrder));
  }

  async getDailyOrdersSummary(): Promise<DailyOrdersSummaryResponse> {
    return this.buildSummary();
  }

  async getBotServiceStatus(): Promise<DailyOrdersBotServiceStatusResponse> {
    const checkedAt = new Date().toISOString();
    const health = await this.dailyOrdersBotClient.getHealthStatus();

    if (!health.ok) {
      const offlineResponse: DailyOrdersBotServiceStatusResponse = {
        ok: false,
        online: false,
        running: false,
        type: '',
        phase: health.phase || 'offline',
        supplier: '',
        status: 'offline',
        message: health.message || 'Bot service is offline.',
        errorCode: health.errorCode || 'BOT_SERVICE_UNREACHABLE',
        executionId: health.executionId || '',
        lastCheckedAt: checkedAt,
        portalConfigured: Boolean(health.portalConfigured),
        mockPortalUrl: health.mockPortalUrl || '',
        currentExecution: null,
      };

      this.logger.log(
        `Bot service status returned to frontend -> ${JSON.stringify(offlineResponse)}`,
      );

      return offlineResponse;
    }

    const executionStatus = await this.dailyOrdersBotClient.getExecutionStatus();
    const currentExecution =
      executionStatus.currentExecution || health.currentExecution || null;

    const onlineResponse: DailyOrdersBotServiceStatusResponse = {
      ok: true,
      online: true,
      running: executionStatus.ok && executionStatus.status === 'running',
      type: currentExecution?.type || '',
      phase:
        executionStatus.phase || currentExecution?.phase || health.phase || 'idle',
      supplier: currentExecution?.supplier || '',
      status:
        executionStatus.ok
          ? executionStatus.status || health.status || 'ok'
          : health.status || 'ok',
      message:
        executionStatus.ok
          ? executionStatus.message || health.message || 'Bot service online.'
          : health.message || 'Bot service online.',
      errorCode:
        executionStatus.ok
          ? executionStatus.errorCode || ''
          : executionStatus.errorCode || '',
      executionId:
        currentExecution?.executionId ||
        executionStatus.executionId ||
        health.executionId ||
        '',
      lastCheckedAt: checkedAt,
      portalConfigured: Boolean(health.portalConfigured),
      mockPortalUrl: health.mockPortalUrl || '',
      currentExecution: currentExecution
        ? {
            executionId: currentExecution.executionId,
            type: currentExecution.type,
            supplier: currentExecution.supplier,
            phase: currentExecution.phase,
            startedAt: currentExecution.startedAt,
          }
        : null,
    };

    this.logger.log(
      `Bot service status returned to frontend -> ${JSON.stringify(onlineResponse)}`,
    );

    return onlineResponse;
  }

  async createDailyOrdersFromPhoto(
    createDailyOrdersFromPhotoDto: CreateDailyOrdersFromPhotoDto,
  ): Promise<DailyOrdersCreateResponse> {
    const dailyOrders = new Map<string, DailyOrderCreateInput['items']>();

    createDailyOrdersFromPhotoDto.entries.forEach((entry) => {
      const quantity = normalizeQuantity(entry.quantity);
      const itemName = normalizeText(entry.itemName);

      if (!itemName || quantity <= 0) {
        return;
      }

      const supplier = normalizeSupplier(entry.supplier);
      const items = dailyOrders.get(supplier) || [];

      items.push({
        itemId: entry.itemId,
        itemName,
        quantity,
        unit: normalizeText(entry.unit),
      });

      dailyOrders.set(supplier, items);
    });

    const createInputs = Array.from(dailyOrders.entries()).map(([supplier, items]) => ({
      supplier,
      source: DailyOrderSource.PHOTO,
      items,
    }));

    if (createInputs.length === 0) {
      throw new BadRequestException(
        'There are no valid photo entries with quantity greater than zero.',
      );
    }

    const createdOrders = await this.dailyOrdersRepository.createDailyOrders(createInputs);

    return {
      createdOrders: createdOrders.map((dailyOrder) => this.mapDailyOrderRecord(dailyOrder)),
      summary: await this.buildSummary(),
    };
  }

  async createDailyOrdersFromSuggestedOrder(
    createDailyOrdersFromSuggestedOrderDto: CreateDailyOrdersFromSuggestedOrderDto,
  ): Promise<DailyOrdersCreateResponse> {
    const dailyOrders = new Map<string, DailyOrderCreateInput['items']>();

    createDailyOrdersFromSuggestedOrderDto.items.forEach((item) => {
      const quantity = normalizeQuantity(item.orderAmount);
      const itemName = normalizeText(item.name);

      if (!itemName || quantity <= 0) {
        return;
      }

      const supplier = normalizeSupplier(item.supplier);
      const items = dailyOrders.get(supplier) || [];

      items.push({
        itemId: item.id,
        itemName,
        quantity,
        unit: normalizeText(item.unit),
      });

      dailyOrders.set(supplier, items);
    });

    const createInputs = Array.from(dailyOrders.entries()).map(([supplier, items]) => ({
      supplier,
      source: DailyOrderSource.SUGGESTED_ORDER,
      items,
    }));

    if (createInputs.length === 0) {
      throw new BadRequestException(
        'There are no suggested order items with quantity greater than zero.',
      );
    }

    const createdOrders = await this.dailyOrdersRepository.createDailyOrders(createInputs);

    return {
      createdOrders: createdOrders.map((dailyOrder) => this.mapDailyOrderRecord(dailyOrder)),
      summary: await this.buildSummary(),
    };
  }

  async updateDailyOrderItemQuantity(
    orderId: string,
    itemIndex: number,
    updateDailyOrderItemDto: UpdateDailyOrderItemDto,
  ): Promise<DailyOrderMutationResponse> {
    const currentOrder = await this.getOrderOrThrow(orderId);
    const hasMatchingItem = currentOrder.items.some((item) => item.itemIndex === itemIndex);

    if (!hasMatchingItem) {
      throw new NotFoundException('Daily order item was not found.');
    }

    if (currentOrder.isLocked || currentOrder.status !== DailyOrderStatus.DRAFT) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'not-editable',
        order: currentOrder,
        errorCode: 'ORDER_LOCKED',
        errorMessage: 'Only unlocked draft orders can be edited.',
      });
    }

    const updatedOrder = await this.dailyOrdersRepository.updateDailyOrderItemQuantity(
      orderId,
      itemIndex,
      normalizeQuantity(updateDailyOrderItemDto.quantity),
    );

    if (!updatedOrder) {
      throw new NotFoundException('Daily order was not found.');
    }

    await this.syncSupplierHistory(updatedOrder);

    return this.buildMutationResponse({
      ok: true,
      reason: 'updated',
      order: updatedOrder,
    });
  }

  async markDailyOrderReady(orderId: string): Promise<DailyOrderMutationResponse> {
    const currentOrder = await this.getOrderOrThrow(orderId);

    if (currentOrder.status === DailyOrderStatus.EXECUTED) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'already-executed',
        order: currentOrder,
        errorCode: 'ORDER_ALREADY_EXECUTED',
        errorMessage: 'This order was already executed.',
      });
    }

    if (currentOrder.status !== DailyOrderStatus.DRAFT) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'not-draft',
        order: currentOrder,
        errorCode: 'ORDER_NOT_DRAFT',
        errorMessage: 'Only draft orders can be marked ready.',
      });
    }

    const updatedOrder = await this.dailyOrdersRepository.updateDailyOrder(orderId, {
      status: DailyOrderStatus.READY_TO_EXECUTE,
      isLocked: true,
      readyAt: new Date(),
    });
    await this.syncSupplierHistory(updatedOrder);

    return this.buildMutationResponse({
      ok: true,
      reason: 'ready',
      order: updatedOrder,
    });
  }

  async unlockDailyOrder(orderId: string): Promise<DailyOrderMutationResponse> {
    const currentOrder = await this.getOrderOrThrow(orderId);

    if (!canUnlockStatus(currentOrder.status)) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'not-allowed',
        order: currentOrder,
        errorCode: 'ORDER_UNLOCK_NOT_ALLOWED',
        errorMessage: 'This order cannot be unlocked in the current status.',
      });
    }

    const updatedOrder = await this.dailyOrdersRepository.updateDailyOrder(orderId, {
      status: DailyOrderStatus.DRAFT,
      isLocked: false,
    });
    await this.syncSupplierHistory(updatedOrder);

    return this.buildMutationResponse({
      ok: true,
      reason: 'unlocked',
      order: updatedOrder,
    });
  }

  async runDailyOrderBotFill(orderId: string): Promise<DailyOrderMutationResponse> {
    const currentOrder = await this.getOrderOrThrow(orderId);

    if (currentOrder.status === DailyOrderStatus.EXECUTED) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'already-executed',
        order: currentOrder,
        errorCode: 'ORDER_ALREADY_EXECUTED',
        errorMessage: 'This order is already executed and cannot run again.',
      });
    }

    const fillingOrder = await this.dailyOrdersRepository.findFirstFillingOrder(orderId);
    if (fillingOrder) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'another-order-filling',
        order: currentOrder,
        errorCode: 'EXECUTION_IN_PROGRESS',
        errorMessage: 'Another order is already being processed.',
      });
    }

    if (!canExecuteStatus(currentOrder.status)) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'not-ready',
        order: currentOrder,
        errorCode: 'ORDER_NOT_READY',
        errorMessage: 'Order must be READY or FAILED before bot fill.',
      });
    }

    const botPayload = buildDailyOrderBotPayload(currentOrder);
    if (botPayload.items.length === 0) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'invalid-order-items',
        order: currentOrder,
        errorCode: 'INVALID_ITEMS',
        errorMessage: 'Order has no valid items with quantity greater than zero.',
      });
    }

    const executionStartedAt = new Date();
    await this.dailyOrdersRepository.updateDailyOrder(orderId, {
      status: DailyOrderStatus.FILLING_ORDER,
      isLocked: true,
      attempts: currentOrder.attempts + 1,
      executionStartedAt,
      executionFinishedAt: null,
      executionDurationMs: null,
      executionNotes: 'Bot service started fill on supplier portal.',
      lastExecutionPhase: 'fill-started',
      lastErrorCode: '',
      lastErrorMessage: '',
    });

    const botResponse = await this.dailyOrdersBotClient.executeFill(botPayload);
    if (botResponse.errorCode === 'EXECUTION_IN_PROGRESS') {
      const restoredOrder = await this.dailyOrdersRepository.updateDailyOrder(orderId, {
        status: currentOrder.status,
        isLocked: currentOrder.isLocked,
        attempts: currentOrder.attempts,
        executionStartedAt: currentOrder.executionStartedAt,
        executionFinishedAt: currentOrder.executionFinishedAt,
        executionDurationMs: currentOrder.executionDurationMs,
        executionNotes: currentOrder.executionNotes,
        lastExecutionPhase: botResponse.phase || 'execution-locked',
        lastErrorCode: botResponse.errorCode,
        lastErrorMessage: botResponse.message,
      });

      return this.buildBotFailureResponse(
        restoredOrder,
        'another-order-filling',
        botResponse,
      );
    }

    const success =
      botResponse.ok &&
      botResponse.status === DAILY_ORDER_STATUS_VALUES.READY_FOR_CHEF_REVIEW;
    const executionFinishedAt =
      toDateOrNull(botResponse.executionFinishedAt) || new Date();
    const executionNotes =
      botResponse.executionNotes ||
      botResponse.message ||
      (success
        ? 'Bot filled order and stopped at review page.'
        : 'Bot fill failed.');

    const updatedOrder = await this.dailyOrdersRepository.updateDailyOrder(orderId, {
      status: success
        ? DailyOrderStatus.READY_FOR_CHEF_REVIEW
        : DailyOrderStatus.FAILED,
      isLocked: true,
      executionFinishedAt,
      executionDurationMs: toDurationOrNull(botResponse.executionDuration),
      filledAt: success
        ? toDateOrNull(botResponse.filledAt) || executionFinishedAt
        : currentOrder.filledAt,
      readyForReviewAt: success
        ? toDateOrNull(botResponse.readyForReviewAt) || executionFinishedAt
        : currentOrder.readyForReviewAt,
      reviewScreenshotPath: success
        ? botResponse.reviewScreenshot || botResponse.screenshotPath
        : currentOrder.reviewScreenshotPath,
      executionNotes,
      lastExecutionId: botResponse.executionId || currentOrder.lastExecutionId,
      lastExecutionPhase: botResponse.phase || currentOrder.lastExecutionPhase,
      lastErrorCode: success ? '' : botResponse.errorCode || 'BOT_FILL_FAILED',
      lastErrorMessage: success ? '' : botResponse.message || executionNotes,
    });
    await this.syncSupplierHistory(updatedOrder);

    if (!success) {
      return this.buildBotFailureResponse(updatedOrder, 'failed', botResponse);
    }

    return this.buildMutationResponse({
      ok: true,
      reason: 'success',
      order: updatedOrder,
      executionId: botResponse.executionId,
      phase: botResponse.phase,
    });
  }

  async finalSubmitDailyOrder(orderId: string): Promise<DailyOrderMutationResponse> {
    const currentOrder = await this.getOrderOrThrow(orderId);

    if (currentOrder.status === DailyOrderStatus.EXECUTED) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'already-executed',
        order: currentOrder,
        errorCode: 'ORDER_ALREADY_EXECUTED',
        errorMessage: 'This order was already finally submitted.',
      });
    }

    if (currentOrder.status !== DailyOrderStatus.READY_FOR_CHEF_REVIEW) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'not-ready-for-final-submit',
        order: currentOrder,
        errorCode: 'ORDER_NOT_READY_FOR_FINAL_SUBMIT',
        errorMessage: 'Final submit is allowed only for READY FOR CHEF REVIEW orders.',
      });
    }

    const fillingOrder = await this.dailyOrdersRepository.findFirstFillingOrder(orderId);
    if (fillingOrder) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'another-order-filling',
        order: currentOrder,
        errorCode: 'EXECUTION_IN_PROGRESS',
        errorMessage: 'Another order is currently being processed.',
      });
    }

    const botPayload = buildDailyOrderBotPayload(currentOrder);
    if (botPayload.items.length === 0) {
      return this.buildMutationResponse({
        ok: false,
        reason: 'invalid-order-items',
        order: currentOrder,
        errorCode: 'INVALID_ITEMS',
        errorMessage: 'Order has no valid items with quantity greater than zero.',
      });
    }

    const chefApprovedAt = new Date();
    await this.dailyOrdersRepository.updateDailyOrder(orderId, {
      status: DailyOrderStatus.FILLING_ORDER,
      isLocked: true,
      chefApprovedAt,
      finalExecutionNotes: 'Chef approved. Submitting final order on supplier portal.',
      lastExecutionPhase: 'final-submit-started',
      lastErrorCode: '',
      lastErrorMessage: '',
    });

    const botResponse = await this.dailyOrdersBotClient.submitFinal(botPayload);
    if (botResponse.errorCode === 'EXECUTION_IN_PROGRESS') {
      const restoredOrder = await this.dailyOrdersRepository.updateDailyOrder(orderId, {
        status: DailyOrderStatus.READY_FOR_CHEF_REVIEW,
        isLocked: true,
        chefApprovedAt: currentOrder.chefApprovedAt,
        finalExecutionNotes: currentOrder.finalExecutionNotes,
        lastExecutionPhase: botResponse.phase || 'final-submit-locked',
        lastErrorCode: botResponse.errorCode,
        lastErrorMessage: botResponse.message,
      });

      return this.buildBotFailureResponse(
        restoredOrder,
        'another-order-filling',
        botResponse,
      );
    }

    const success =
      botResponse.ok && botResponse.status === DAILY_ORDER_STATUS_VALUES.EXECUTED;
    const finalNotes =
      botResponse.finalExecutionNotes ||
      botResponse.message ||
      (success ? 'Final submit completed.' : 'Final submit failed.');

    const updatedOrder = await this.dailyOrdersRepository.updateDailyOrder(orderId, {
      status: success ? DailyOrderStatus.EXECUTED : DailyOrderStatus.FAILED,
      isLocked: true,
      chefApprovedAt,
      submitStartedAt:
        toDateOrNull(botResponse.submitStartedAt) || currentOrder.submitStartedAt,
      submittedAt: success
        ? toDateOrNull(botResponse.submittedAt) || new Date()
        : currentOrder.submittedAt,
      submitFinishedAt:
        toDateOrNull(botResponse.submitFinishedAt) || currentOrder.submitFinishedAt,
      submitDurationMs: toDurationOrNull(botResponse.submitDuration),
      orderNumber: success ? botResponse.orderNumber : currentOrder.orderNumber,
      finalScreenshotPath: success
        ? botResponse.finalScreenshot
        : currentOrder.finalScreenshotPath,
      finalExecutionNotes: finalNotes,
      executionNotes: success
        ? 'Final submit completed on supplier portal.'
        : currentOrder.executionNotes,
      lastExecutionId: botResponse.executionId || currentOrder.lastExecutionId,
      lastExecutionPhase: botResponse.phase || currentOrder.lastExecutionPhase,
      lastErrorCode: success ? '' : botResponse.errorCode || 'FINAL_SUBMIT_FAILED',
      lastErrorMessage: success ? '' : botResponse.message || finalNotes,
    });
    await this.syncSupplierHistory(updatedOrder);

    if (!success) {
      return this.buildBotFailureResponse(updatedOrder, 'failed', botResponse);
    }

    return this.buildMutationResponse({
      ok: true,
      reason: 'success',
      order: updatedOrder,
      executionId: botResponse.executionId,
      phase: botResponse.phase,
    });
  }

  async resetDailyOrders(): Promise<DailyOrdersResetResponse> {
    const fillingOrder = await this.dailyOrdersRepository.findFirstFillingOrder();
    if (fillingOrder) {
      return {
        ok: false,
        deletedCount: 0,
        summary: await this.buildSummary(),
        reason: 'order-filling',
        errorCode: 'EXECUTION_IN_PROGRESS',
        errorMessage: 'Cannot reset daily orders while an execution is in progress.',
      };
    }

    const deletedCount = await this.dailyOrdersRepository.deleteAllDailyOrders();

    return {
      ok: true,
      deletedCount,
      summary: createEmptyDailyOrdersSummary(),
      reason: 'reset',
      errorCode: '',
      errorMessage: '',
    };
  }

  private async getOrderOrThrow(orderId: string) {
    const dailyOrder = await this.dailyOrdersRepository.findDailyOrderById(orderId);

    if (!dailyOrder) {
      throw new NotFoundException('Daily order was not found.');
    }

    return dailyOrder;
  }

  private async buildSummary() {
    const counts = await this.dailyOrdersRepository.getSummaryCounts();
    return mapSummaryCountsToResponse(counts);
  }

  private async buildMutationResponse({
    ok,
    reason,
    order,
    errorCode = '',
    errorMessage = '',
    executionId = '',
    phase = '',
  }: {
    ok: boolean;
    reason: string;
    order: DailyOrderRecord | null;
    errorCode?: string;
    errorMessage?: string;
    executionId?: string;
    phase?: string;
  }): Promise<DailyOrderMutationResponse> {
    return {
      ok,
      reason,
      order: order ? this.mapDailyOrderRecord(order) : null,
      summary: await this.buildSummary(),
      errorCode,
      errorMessage,
      executionId,
      phase,
    };
  }

  private buildBotFailureResponse(
    order: DailyOrderRecord,
    reason: string,
    botResponse: DailyOrdersBotResponse,
  ) {
    return this.buildMutationResponse({
      ok: false,
      reason,
      order,
      errorCode: botResponse.errorCode || 'BOT_SERVICE_ERROR',
      errorMessage: botResponse.message || 'Bot service request failed.',
      executionId: botResponse.executionId,
      phase: botResponse.phase,
    });
  }

  private syncSupplierHistory(order: DailyOrderRecord) {
    return this.supplierHistoryService.syncFromDailyOrder({
      dailyOrderId: order.id,
      supplierName: normalizeSupplier(order.supplier),
      items: order.items.map((item) => ({
        name: normalizeText(item.itemName),
        itemId: item.itemId,
        quantity: normalizeQuantity(item.quantity),
        unit: normalizeText(item.unit),
      })),
      totalItems: order.items.length,
      totalQuantity: order.totalQuantity,
      status: order.status,
      createdAt: order.readyAt || order.createdAt,
      updatedAt: order.updatedAt,
    });
  }

  private mapDailyOrderRecord(dailyOrder: DailyOrderRecord): DailyOrderResponse {
    return {
      id: dailyOrder.id,
      supplier: normalizeSupplier(dailyOrder.supplier),
      source:
        dailyOrder.source === DailyOrderSource.PHOTO ? 'photo' : 'suggested-order',
      items: dailyOrder.items.map((item) => ({
        itemIndex: item.itemIndex,
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
      })),
      totalQuantity: dailyOrder.totalQuantity,
      createdAt: dailyOrder.createdAt.toISOString(),
      status: mapPrismaDailyOrderStatusToApi(dailyOrder.status),
      isLocked: dailyOrder.isLocked,
      attempts: dailyOrder.attempts,
      readyAt: toIsoString(dailyOrder.readyAt),
      executionStartedAt: toIsoString(dailyOrder.executionStartedAt),
      executionFinishedAt: toIsoString(dailyOrder.executionFinishedAt),
      executionDuration: dailyOrder.executionDurationMs ?? null,
      filledAt: toIsoString(dailyOrder.filledAt),
      readyForReviewAt: toIsoString(dailyOrder.readyForReviewAt),
      executionNotes: dailyOrder.executionNotes,
      reviewScreenshot: dailyOrder.reviewScreenshotPath,
      chefApprovedAt: toIsoString(dailyOrder.chefApprovedAt),
      submittedAt: toIsoString(dailyOrder.submittedAt),
      submitStartedAt: toIsoString(dailyOrder.submitStartedAt),
      submitFinishedAt: toIsoString(dailyOrder.submitFinishedAt),
      submitDuration: dailyOrder.submitDurationMs ?? null,
      finalExecutionNotes: dailyOrder.finalExecutionNotes,
      finalScreenshot: dailyOrder.finalScreenshotPath,
      orderNumber: dailyOrder.orderNumber,
      lastExecutionId: dailyOrder.lastExecutionId,
      lastExecutionPhase: dailyOrder.lastExecutionPhase,
      lastErrorCode: dailyOrder.lastErrorCode,
      lastErrorMessage: dailyOrder.lastErrorMessage,
    };
  }
}
