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

const executableInvoiceStatuses = [InvoiceStatus.QUEUED, InvoiceStatus.FAILED];

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

  findNextQueuedInvoiceForExecution() {
    return this.prismaService.invoice.findFirst({
      where: {
        status: InvoiceStatus.QUEUED,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: invoiceInclude,
    });
  }

  findStaleProcessingInvoices(cutoff: Date) {
    return this.prismaService.invoice.findMany({
      where: {
        status: InvoiceStatus.PROCESSING,
        executionStartedAt: {
          lt: cutoff,
        },
      },
      orderBy: [{ executionStartedAt: 'asc' }, { id: 'asc' }],
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

  acquireInvoiceExecutionLock(
    invoiceId: string,
    data: Prisma.InvoiceUpdateManyMutationInput,
  ) {
    return this.prismaService.$transaction(async (transaction) => {
      const result = await transaction.invoice.updateMany({
        where: {
          id: invoiceId,
          status: {
            in: executableInvoiceStatuses,
          },
        },
        data,
      });

      if (result.count === 0) {
        return null;
      }

      return transaction.invoice.findUnique({
        where: {
          id: invoiceId,
        },
        include: invoiceInclude,
      });
    });
  }

  markProcessingInvoiceAsTimedOut(
    invoiceId: string,
    cutoff: Date,
    data: Prisma.InvoiceUpdateManyMutationInput,
  ) {
    return this.prismaService.invoice.updateMany({
      where: {
        id: invoiceId,
        status: InvoiceStatus.PROCESSING,
        executionStartedAt: {
          lt: cutoff,
        },
      },
      data,
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
