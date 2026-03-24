import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceStatus, Prisma } from '../../generated/prisma/client';

const invoiceInclude = {
  items: {
    orderBy: {
      itemIndex: 'asc',
    },
  },
} satisfies Prisma.InvoiceInclude;

export type InvoiceRecord = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  listInvoices() {
    return this.prismaService.invoice.findMany({
      orderBy: [{ createdAt: 'desc' }, { supplier: 'asc' }],
      include: invoiceInclude,
    });
  }

  findInvoiceById(invoiceId: string) {
    return this.prismaService.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: invoiceInclude,
    });
  }

  createInvoice(data: Prisma.InvoiceCreateInput) {
    return this.prismaService.invoice.create({
      data,
      include: invoiceInclude,
    });
  }

  updateInvoice(invoiceId: string, data: Prisma.InvoiceUpdateInput) {
    return this.prismaService.invoice.update({
      where: {
        id: invoiceId,
      },
      data,
      include: invoiceInclude,
    });
  }

  async getSummaryCounts() {
    const groupedCounts = await this.prismaService.invoice.groupBy({
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

  deleteInvoice(invoiceId: string) {
    return this.prismaService.invoice.delete({
      where: {
        id: invoiceId,
      },
    });
  }

  async countInvoicesByStatus(status: InvoiceStatus) {
    return this.prismaService.invoice.count({
      where: {
        status,
      },
    });
  }
}
