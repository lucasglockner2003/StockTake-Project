import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
  DailyOrderStatus,
  Prisma,
} from '../../generated/prisma/client';
import { DailyOrderCreateInput } from './daily-orders.types';

const dailyOrderInclude = {
  items: {
    orderBy: {
      itemIndex: 'asc',
    },
  },
} satisfies Prisma.DailyOrderInclude;

const dailyOrderItemQuantitiesSelect = {
  items: {
    select: {
      itemIndex: true,
      quantity: true,
    },
  },
} satisfies Prisma.DailyOrderSelect;

export type DailyOrderRecord = Prisma.DailyOrderGetPayload<{
  include: typeof dailyOrderInclude;
}>;

function calculateTotalQuantity(
  items: Array<{
    quantity: number;
  }>,
) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

@Injectable()
export class DailyOrdersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  listDailyOrders() {
    return this.prismaService.dailyOrder.findMany({
      orderBy: [{ createdAt: 'desc' }, { supplier: 'asc' }],
      include: dailyOrderInclude,
    });
  }

  findDailyOrderById(orderId: string) {
    return this.prismaService.dailyOrder.findUnique({
      where: {
        id: orderId,
      },
      include: dailyOrderInclude,
    });
  }

  findFirstFillingOrder(excludeOrderId?: string) {
    return this.prismaService.dailyOrder.findFirst({
      where: {
        status: DailyOrderStatus.FILLING_ORDER,
        ...(excludeOrderId
          ? {
              id: {
                not: excludeOrderId,
              },
            }
          : {}),
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: dailyOrderInclude,
    });
  }

  async createDailyOrders(dailyOrders: DailyOrderCreateInput[]) {
    if (dailyOrders.length === 0) {
      return [];
    }

    return this.prismaService.$transaction(
      dailyOrders.map((dailyOrder) =>
        this.prismaService.dailyOrder.create({
          data: {
            supplier: dailyOrder.supplier,
            source: dailyOrder.source,
            isLocked: false,
            totalQuantity: calculateTotalQuantity(dailyOrder.items),
            items: {
              create: dailyOrder.items.map((item, itemIndex) => ({
                itemIndex,
                itemId: item.itemId,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
              })),
            },
          },
          include: dailyOrderInclude,
        }),
      ),
    );
  }

  async updateDailyOrderItemQuantity(
    orderId: string,
    itemIndex: number,
    quantity: number,
  ) {
    return this.prismaService.$transaction(async (transactionClient) => {
      const currentOrder = await transactionClient.dailyOrder.findUnique({
        where: {
          id: orderId,
        },
        select: dailyOrderItemQuantitiesSelect,
      });

      if (!currentOrder) {
        return null;
      }

      const existingItem = currentOrder.items.find(
        (item) => item.itemIndex === itemIndex,
      );

      if (!existingItem) {
        return null;
      }

      const nextTotalQuantity = currentOrder.items.reduce((sum, item) => {
        if (item.itemIndex === itemIndex) {
          return sum + quantity;
        }

        return sum + item.quantity;
      }, 0);

      await transactionClient.dailyOrderItem.update({
        where: {
          dailyOrderId_itemIndex: {
            dailyOrderId: orderId,
            itemIndex,
          },
        },
        data: {
          quantity,
        },
      });

      return transactionClient.dailyOrder.update({
        where: {
          id: orderId,
        },
        data: {
          totalQuantity: nextTotalQuantity,
        },
        include: dailyOrderInclude,
      });
    });
  }

  updateDailyOrder(orderId: string, data: Prisma.DailyOrderUpdateInput) {
    return this.prismaService.dailyOrder.update({
      where: {
        id: orderId,
      },
      data,
      include: dailyOrderInclude,
    });
  }

  async getSummaryCounts() {
    const groupedCounts = await this.prismaService.dailyOrder.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    return groupedCounts.map((group) => ({
      status: group.status,
      count: group._count._all,
    }));
  }

  async deleteAllDailyOrders() {
    const deleteResult = await this.prismaService.dailyOrder.deleteMany();
    return deleteResult.count;
  }
}
