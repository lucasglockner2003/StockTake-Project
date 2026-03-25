import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

const supplierHistoryInclude = {
  dailyOrder: {
    include: {
      items: {
        orderBy: {
          itemIndex: 'asc',
        },
      },
    },
  },
} satisfies Prisma.SupplierOrderHistoryInclude;

export type SupplierHistoryRecord = Prisma.SupplierOrderHistoryGetPayload<{
  include: typeof supplierHistoryInclude;
}>;

@Injectable()
export class SupplierHistoryRepository {
  constructor(private readonly prismaService: PrismaService) {}

  listHistory() {
    return this.prismaService.supplierOrderHistory.findMany({
      orderBy: [{ createdAt: 'desc' }, { supplierName: 'asc' }],
      include: supplierHistoryInclude,
    });
  }

  findById(id: string) {
    return this.prismaService.supplierOrderHistory.findUnique({
      where: {
        id,
      },
      include: supplierHistoryInclude,
    });
  }

  findByDailyOrderId(dailyOrderId: string) {
    return this.prismaService.supplierOrderHistory.findUnique({
      where: {
        dailyOrderId,
      },
      include: supplierHistoryInclude,
    });
  }

  findBySupplierName(supplierName: string) {
    return this.prismaService.supplierOrderHistory.findMany({
      where: {
        supplierName,
      },
      orderBy: [{ createdAt: 'desc' }, { revisionNumber: 'desc' }],
      include: supplierHistoryInclude,
    });
  }

  createHistory(data: Prisma.SupplierOrderHistoryCreateInput) {
    return this.prismaService.supplierOrderHistory.create({
      data,
      include: supplierHistoryInclude,
    });
  }

  updateHistory(id: string, data: Prisma.SupplierOrderHistoryUpdateInput) {
    return this.prismaService.supplierOrderHistory.update({
      where: {
        id,
      },
      data,
      include: supplierHistoryInclude,
    });
  }

  async deleteAllHistory() {
    const deleted = await this.prismaService.supplierOrderHistory.deleteMany();
    return deleted.count;
  }

  async getLatestRevisionNumber(supplierName: string) {
    const latest = await this.prismaService.supplierOrderHistory.findFirst({
      where: {
        supplierName,
      },
      orderBy: [{ revisionNumber: 'desc' }, { createdAt: 'desc' }],
      select: {
        revisionNumber: true,
      },
    });

    return latest?.revisionNumber || 0;
  }
}
