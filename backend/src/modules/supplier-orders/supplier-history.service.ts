import { Injectable, NotFoundException } from '@nestjs/common';
import { DailyOrderStatus, Prisma } from '../../generated/prisma/client';
import { GetSupplierHistoryByIdDto } from './dto/get-supplier-history-by-id.dto';
import { GetSupplierHistoryBySupplierDto } from './dto/get-supplier-history-by-supplier.dto';
import {
  SupplierHistoryRecord,
  SupplierHistoryRepository,
} from './supplier-history.repository';
import {
  mapDailyOrderStatusToApi,
  mapDailyOrderStatusToSupplierHistoryStatus,
  mapSupplierHistoryStatusToApi,
  SupplierHistoryItemResponse,
  SupplierHistoryResetResponse,
  SupplierHistoryResponse,
  SupplierHistorySnapshotItemInput,
  SupplierHistorySyncInput,
} from './supplier-history.types';

function normalizeString(value: unknown, fallback = '') {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue || fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeInteger(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(Math.round(numericValue), 0) : fallback;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHistoryItems(value: Prisma.JsonValue): SupplierHistoryItemResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isObjectRecord(item)) {
        return null;
      }

      const name = normalizeString(item.name ?? item.itemName);
      const quantity = Math.max(normalizeNumber(item.quantity), 0);

      if (!name) {
        return null;
      }

      return {
        name,
        itemId:
          item.itemId === undefined || item.itemId === null
            ? null
            : normalizeInteger(item.itemId, 0),
        quantity,
        unit: normalizeString(item.unit),
      };
    })
    .filter((item): item is SupplierHistoryItemResponse => item !== null);
}

function buildHistoryItemsSnapshot(
  items: SupplierHistorySnapshotItemInput[],
): Prisma.InputJsonValue {
  return items.map((item) => ({
    name: normalizeString(item.name),
    itemId: item.itemId,
    quantity: Math.max(normalizeNumber(item.quantity), 0),
    unit: normalizeString(item.unit),
  })) satisfies Prisma.InputJsonArray;
}

function shouldCreateHistoryForStatus(status: DailyOrderStatus) {
  return status !== DailyOrderStatus.DRAFT;
}

@Injectable()
export class SupplierHistoryService {
  constructor(private readonly supplierHistoryRepository: SupplierHistoryRepository) {}

  async listHistory(): Promise<SupplierHistoryResponse[]> {
    const history = await this.supplierHistoryRepository.listHistory();
    return history.map((entry) => this.mapHistoryRecord(entry));
  }

  async getHistoryById(
    getSupplierHistoryByIdDto: GetSupplierHistoryByIdDto,
  ): Promise<SupplierHistoryResponse> {
    const history = await this.supplierHistoryRepository.findById(
      getSupplierHistoryByIdDto.id,
    );

    if (!history) {
      throw new NotFoundException('Supplier history entry was not found.');
    }

    return this.mapHistoryRecord(history);
  }

  async getHistoryBySupplier(
    getSupplierHistoryBySupplierDto: GetSupplierHistoryBySupplierDto,
  ): Promise<SupplierHistoryResponse[]> {
    const supplierName = decodeURIComponent(
      getSupplierHistoryBySupplierDto.supplierId,
    ).trim();
    const history = await this.supplierHistoryRepository.findBySupplierName(
      supplierName,
    );

    return history.map((entry) => this.mapHistoryRecord(entry));
  }

  async clearHistory(): Promise<SupplierHistoryResetResponse> {
    const deletedCount = await this.supplierHistoryRepository.deleteAllHistory();

    return {
      ok: true,
      deletedCount,
    };
  }

  async syncFromDailyOrder(order: SupplierHistorySyncInput) {
    const existingHistory = await this.supplierHistoryRepository.findByDailyOrderId(
      order.dailyOrderId,
    );
    const shouldTrack = Boolean(existingHistory) || shouldCreateHistoryForStatus(order.status);

    if (!shouldTrack) {
      return null;
    }

    const supplierName = normalizeString(order.supplierName, 'Unknown Supplier');
    const items = buildHistoryItemsSnapshot(order.items);
    const status = mapDailyOrderStatusToSupplierHistoryStatus(order.status);
    const totalItems = Math.max(normalizeInteger(order.totalItems), 0);
    const totalQuantity = Math.max(normalizeNumber(order.totalQuantity), 0);

    if (existingHistory) {
      return this.supplierHistoryRepository.updateHistory(existingHistory.id, {
        supplierName,
        items,
        totalItems,
        totalQuantity,
        status,
        dailyOrder: {
          connect: {
            id: order.dailyOrderId,
          },
        },
      });
    }

    const revisionNumber =
      (await this.supplierHistoryRepository.getLatestRevisionNumber(supplierName)) + 1;

    return this.supplierHistoryRepository.createHistory({
      supplierName,
      items,
      totalItems,
      totalQuantity,
      status,
      revisionNumber,
      createdAt: order.createdAt,
      dailyOrder: {
        connect: {
          id: order.dailyOrderId,
        },
      },
    });
  }

  private mapHistoryRecord(record: SupplierHistoryRecord): SupplierHistoryResponse {
    const createdAt = record.createdAt.toISOString();
    const updatedAt = record.updatedAt.toISOString();

    return {
      id: record.id,
      dailyOrderId: record.dailyOrderId,
      jobId: record.dailyOrderId,
      supplier: record.supplierName,
      supplierName: record.supplierName,
      items: normalizeHistoryItems(record.items),
      totalItems: record.totalItems,
      totalQuantity: record.totalQuantity,
      status: mapSupplierHistoryStatusToApi(record.status),
      revisionNumber: record.revisionNumber,
      createdAt,
      updatedAt,
      timestamp: updatedAt,
      snapshotTimestamp: createdAt,
      dailyOrderStatus: record.dailyOrder
        ? mapDailyOrderStatusToApi(record.dailyOrder.status)
        : 'deleted',
    };
  }
}
