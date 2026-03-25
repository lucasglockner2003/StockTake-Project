import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

const stockItemSelect = {
  id: true,
  name: true,
  unit: true,
  category: true,
  supplierName: true,
  aliases: true,
  area: true,
  idealStock: true,
  critical: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StockItemSelect;

export type StockItemRecord = Prisma.StockItemGetPayload<{
  select: typeof stockItemSelect;
}>;

@Injectable()
export class StockItemsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  listActive() {
    return this.prismaService.stockItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ area: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: stockItemSelect,
    });
  }

  findById(id: number) {
    return this.prismaService.stockItem.findUnique({
      where: {
        id,
      },
      select: stockItemSelect,
    });
  }

  create(data: Prisma.StockItemCreateInput) {
    return this.prismaService.stockItem.create({
      data,
      select: stockItemSelect,
    });
  }

  update(id: number, data: Prisma.StockItemUpdateInput) {
    return this.prismaService.stockItem.update({
      where: {
        id,
      },
      data,
      select: stockItemSelect,
    });
  }

  async getNextId() {
    const latestItem = await this.prismaService.stockItem.findFirst({
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
      },
    });

    return (latestItem?.id || 0) + 1;
  }
}
