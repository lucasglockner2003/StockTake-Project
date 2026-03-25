import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class StockTakeRepository {
  constructor(private readonly prismaService: PrismaService) {}

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

  findActiveStockItemById(stockItemId: number) {
    return this.prismaService.stockItem.findFirst({
      where: {
        id: stockItemId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
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
        supplierName: true,
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
