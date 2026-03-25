import { Injectable, NotFoundException } from '@nestjs/common';

import { StockTakeRepository } from './stock-take.repository';
import { UpdateStockTakeItemDto } from './dto/update-stock-take-item.dto';
import {
  StockTakeMutationResponse,
  StockTakeStatus,
  StockTakeSummaryResponse,
  StockTakeTodayItemResponse,
  StockTakeTodayResponse,
} from './stock-take.types';

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function getTodayDateKey() {
  const now = new Date();

  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(
    now.getDate(),
  )}`;
}

function getTodayDateValue() {
  const takeDateKey = getTodayDateKey();

  return {
    takeDateKey,
    takeDate: new Date(`${takeDateKey}T00:00:00`),
  };
}

function getStockTakeItemStatus(
  idealStock: number,
  critical: boolean,
  quantity: number | null,
): StockTakeStatus {
  if (quantity === null || quantity === undefined) {
    return 'Pending';
  }

  const numericQuantity = Number(quantity);
  const checkLimit = idealStock * 5;
  const criticalLimit = idealStock * 0.25;
  const lowLimit = idealStock * 0.5;

  if (numericQuantity >= checkLimit) {
    return 'Check';
  }

  if (critical) {
    if (numericQuantity <= criticalLimit) {
      return 'Critical';
    }

    if (numericQuantity <= lowLimit) {
      return 'Low';
    }
  }

  return 'Ok';
}

function getLatestUpdatedAt(
  items: StockTakeTodayItemResponse[],
  fallbackUpdatedAt: Date | null | undefined,
) {
  const updatedAtTimestamps = items
    .map((item) => (item.updatedAt ? new Date(item.updatedAt).getTime() : 0))
    .filter((value) => value > 0);

  const fallbackTimestamp = fallbackUpdatedAt ? fallbackUpdatedAt.getTime() : 0;
  const latestTimestamp = Math.max(fallbackTimestamp, ...updatedAtTimestamps);

  if (!latestTimestamp || Number.isNaN(latestTimestamp)) {
    return null;
  }

  return new Date(latestTimestamp).toISOString();
}

function buildStockTakeSummary(
  takeDate: string,
  items: StockTakeTodayItemResponse[],
  fallbackUpdatedAt: Date | null | undefined,
): StockTakeSummaryResponse {
  const summary = items.reduce(
    (accumulator, item) => {
      accumulator.totalItems += 1;

      if (item.quantity !== null && item.quantity !== undefined) {
        accumulator.filledItems += 1;
      }

      if (item.status === 'Ok') {
        accumulator.okCount += 1;
      }

      if (item.status === 'Critical') {
        accumulator.criticalCount += 1;
      }

      if (item.status === 'Low') {
        accumulator.lowCount += 1;
      }

      if (item.status === 'Check') {
        accumulator.checkCount += 1;
      }

      return accumulator;
    },
    {
      totalItems: 0,
      filledItems: 0,
      okCount: 0,
      criticalCount: 0,
      lowCount: 0,
      checkCount: 0,
    },
  );

  const missingItems = summary.totalItems - summary.filledItems;
  const progress =
    summary.totalItems === 0
      ? 0
      : Math.round((summary.filledItems / summary.totalItems) * 100);

  return {
    takeDate,
    totalItems: summary.totalItems,
    filledItems: summary.filledItems,
    missingItems,
    progress,
    okCount: summary.okCount,
    criticalCount: summary.criticalCount,
    lowCount: summary.lowCount,
    checkCount: summary.checkCount,
    lastUpdatedAt: getLatestUpdatedAt(items, fallbackUpdatedAt),
  };
}

@Injectable()
export class StockTakeService {
  constructor(private readonly stockTakeRepository: StockTakeRepository) {}

  async getTodayStockTake(): Promise<StockTakeTodayResponse> {
    const todayContext = await this.ensureTodayContext();
    return this.buildTodayStockTakeResponse(
      todayContext.stockTake.id,
      todayContext.takeDateKey,
      todayContext.stockTake.lastResetAt,
    );
  }

  async updateTodayStockTakeItem(
    itemId: number,
    updateStockTakeItemDto: UpdateStockTakeItemDto,
  ): Promise<StockTakeMutationResponse> {
    const todayContext = await this.ensureTodayContext();
    const stockItem = await this.stockTakeRepository.findActiveStockItemById(itemId);

    if (!stockItem) {
      throw new NotFoundException('Stock item was not found.');
    }

    if (updateStockTakeItemDto.quantity === null || updateStockTakeItemDto.quantity === undefined) {
      await this.stockTakeRepository.deleteStockTakeEntry(todayContext.stockTake.id, itemId);
    } else {
      await this.stockTakeRepository.upsertStockTakeEntry(
        todayContext.stockTake.id,
        itemId,
        updateStockTakeItemDto.quantity,
      );
    }

    const todayStockTake = await this.buildTodayStockTakeResponse(
      todayContext.stockTake.id,
      todayContext.takeDateKey,
      todayContext.stockTake.lastResetAt,
    );
    const updatedItem = todayStockTake.items.find((item) => item.itemId === itemId) || null;

    return {
      itemId,
      quantity: updatedItem?.quantity ?? null,
      updatedAt: updatedItem?.updatedAt || todayStockTake.lastUpdatedAt,
      summary: todayStockTake.summary,
    };
  }

  async resetTodayStockTake(): Promise<StockTakeTodayResponse> {
    const todayContext = await this.ensureTodayContext();

    await this.stockTakeRepository.resetStockTakeEntries(todayContext.stockTake.id, new Date());

    const refreshedStockTake = await this.stockTakeRepository.findOrCreateStockTake(
      todayContext.takeDate,
    );

    return this.buildTodayStockTakeResponse(
      refreshedStockTake.id,
      todayContext.takeDateKey,
      refreshedStockTake.lastResetAt,
    );
  }

  async getTodaySummary(): Promise<StockTakeSummaryResponse> {
    const todayStockTake = await this.getTodayStockTake();
    return todayStockTake.summary;
  }

  private async ensureTodayContext() {
    const { takeDate, takeDateKey } = getTodayDateValue();
    const stockTake = await this.stockTakeRepository.findOrCreateStockTake(takeDate);

    return {
      takeDate,
      takeDateKey,
      stockTake,
    };
  }

  private async buildTodayStockTakeResponse(
    stockTakeId: string,
    takeDateKey: string,
    fallbackUpdatedAt: Date | null | undefined = null,
  ): Promise<StockTakeTodayResponse> {
    const stockItems = await this.stockTakeRepository.listStockItemsWithTakeEntry(stockTakeId);

    const items = stockItems.map<StockTakeTodayItemResponse>((stockItem) => {
      const stockTakeEntry = stockItem.stockTakeEntries[0];
      const quantity = stockTakeEntry?.quantity ?? null;
      const status = getStockTakeItemStatus(stockItem.idealStock, stockItem.critical, quantity);

      return {
        itemId: stockItem.id,
        name: stockItem.name,
        supplier: stockItem.supplierName || '',
        unit: stockItem.unit,
        area: stockItem.area,
        idealStock: stockItem.idealStock,
        critical: stockItem.critical,
        quantity,
        status,
        updatedAt: stockTakeEntry?.updatedAt?.toISOString() || null,
      };
    });

    const summary = buildStockTakeSummary(takeDateKey, items, fallbackUpdatedAt);

    return {
      stockTakeId,
      takeDate: takeDateKey,
      lastUpdatedAt: summary.lastUpdatedAt,
      summary,
      items,
    };
  }
}
