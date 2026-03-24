import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { StockItemSnapshotDto } from './dto/stock-item-snapshot.dto';
import { StockTakeCatalogItem } from './stock-take.types';

@Injectable()
export class StockTakeRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async syncCatalog(items: StockTakeCatalogItem[]) {
    if (items.length === 0) {
      return;
    }

    await this.prismaService.$transaction(
      items.map((item) =>
        this.prismaService.stockItem.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            supplier: item.supplier || null,
            unit: item.unit,
            area: item.area,
            idealStock: item.idealStock,
            critical: Boolean(item.critical),
            isActive: true,
          },
          create: {
            id: item.id,
            name: item.name,
            supplier: item.supplier || null,
            unit: item.unit,
            area: item.area,
            idealStock: item.idealStock,
            critical: Boolean(item.critical),
            isActive: true,
          },
        }),
      ),
    );
  }

  upsertStockItem(itemId: number, stockItem: StockItemSnapshotDto) {
    return this.prismaService.stockItem.upsert({
      where: { id: itemId },
      update: {
        name: stockItem.name,
        supplier: stockItem.supplier || null,
        unit: stockItem.unit,
        area: stockItem.area,
        idealStock: stockItem.idealStock,
        critical: Boolean(stockItem.critical),
        isActive: true,
      },
      create: {
        id: itemId,
        name: stockItem.name,
        supplier: stockItem.supplier || null,
        unit: stockItem.unit,
        area: stockItem.area,
        idealStock: stockItem.idealStock,
        critical: Boolean(stockItem.critical),
        isActive: true,
      },
    });
  }

  findStockTakeByDate(takeDate: Date) {
    return this.prismaService.stockTake.findUnique({
      where: { takeDate },
    });
  }

  createStockTake(takeDate: Date) {
    return this.prismaService.stockTake.create({
      data: {
        takeDate,
      },
    });
  }

  async findOrCreateStockTake(takeDate: Date) {
    const existingStockTake = await this.findStockTakeByDate(takeDate);

    if (existingStockTake) {
      return existingStockTake;
    }

    return this.createStockTake(takeDate);
  }

  listStockItemsWithTakeEntry(stockTakeId: string) {
    return this.prismaService.stockItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ area: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        supplier: true,
        unit: true,
        area: true,
        idealStock: true,
        critical: true,
        stockTakeEntries: {
          where: {
            stockTakeId,
          },
          select: {
            quantity: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  upsertStockTakeEntry(stockTakeId: string, stockItemId: number, quantity: number) {
    return this.prismaService.stockTakeEntry.upsert({
      where: {
        stockTakeId_stockItemId: {
          stockTakeId,
          stockItemId,
        },
      },
      update: {
        quantity,
      },
      create: {
        stockTakeId,
        stockItemId,
        quantity,
      },
    });
  }

  deleteStockTakeEntry(stockTakeId: string, stockItemId: number) {
    return this.prismaService.stockTakeEntry.deleteMany({
      where: {
        stockTakeId,
        stockItemId,
      },
    });
  }

  async resetStockTakeEntries(stockTakeId: string, resetAt: Date) {
    await this.prismaService.$transaction([
      this.prismaService.stockTakeEntry.deleteMany({
        where: {
          stockTakeId,
        },
      }),
      this.prismaService.stockTake.update({
        where: {
          id: stockTakeId,
        },
        data: {
          lastResetAt: resetAt,
        },
      }),
    ]);
  }
}
