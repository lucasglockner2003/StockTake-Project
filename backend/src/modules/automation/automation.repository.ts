import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AutomationJobSource,
  AutomationJobStatus,
  Prisma,
  SupplierOrderHistoryStatus,
} from '../../generated/prisma/client';

const automationJobInclude = {
  items: {
    orderBy: {
      sequence: 'asc',
    },
  },
  supplierHistory: true,
} satisfies Prisma.AutomationJobInclude;

const supplierOrderHistoryInclude = {
  automationJob: {
    include: {
      items: {
        orderBy: {
          sequence: 'asc',
        },
      },
    },
  },
} satisfies Prisma.SupplierOrderHistoryRevisionInclude;

export type AutomationJobRecord = Prisma.AutomationJobGetPayload<{
  include: typeof automationJobInclude;
}>;

export type SupplierOrderHistoryRecord = Prisma.SupplierOrderHistoryRevisionGetPayload<{
  include: typeof supplierOrderHistoryInclude;
}>;

@Injectable()
export class AutomationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  listJobs() {
    return this.prismaService.automationJob.findMany({
      orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
      include: automationJobInclude,
    });
  }

  findJobById(jobId: string) {
    return this.prismaService.automationJob.findUnique({
      where: {
        id: jobId,
      },
      include: automationJobInclude,
    });
  }

  createJob(data: Prisma.AutomationJobCreateInput) {
    return this.prismaService.automationJob.create({
      data,
      include: automationJobInclude,
    });
  }

  updateJob(jobId: string, data: Prisma.AutomationJobUpdateInput) {
    return this.prismaService.automationJob.update({
      where: {
        id: jobId,
      },
      data,
      include: automationJobInclude,
    });
  }

  async getSummaryCounts() {
    const groupedCounts = await this.prismaService.automationJob.groupBy({
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

  deleteJob(jobId: string) {
    return this.prismaService.automationJob.delete({
      where: {
        id: jobId,
      },
    });
  }

  async deleteAllJobs() {
    const deleteResult = await this.prismaService.automationJob.deleteMany();
    return deleteResult.count;
  }

  listSupplierOrderHistory() {
    return this.prismaService.supplierOrderHistoryRevision.findMany({
      orderBy: [{ snapshotTimestamp: 'desc' }, { createdAt: 'desc' }],
      include: supplierOrderHistoryInclude,
    });
  }

  findSupplierOrderHistoryByJobId(jobId: string) {
    return this.prismaService.supplierOrderHistoryRevision.findUnique({
      where: {
        automationJobId: jobId,
      },
      include: supplierOrderHistoryInclude,
    });
  }

  upsertSupplierOrderHistoryByJobId(
    jobId: string,
    data: {
      supplier: string;
      totalQuantity: number;
      status: SupplierOrderHistoryStatus;
      attempts: number;
      revisionNumber: number;
      snapshotTimestamp: Date;
      snapshotSignature: string;
      snapshot: Prisma.InputJsonValue;
    },
  ) {
    return this.prismaService.supplierOrderHistoryRevision.upsert({
      where: {
        automationJobId: jobId,
      },
      update: data,
      create: {
        automationJob: {
          connect: {
            id: jobId,
          },
        },
        ...data,
      },
      include: supplierOrderHistoryInclude,
    });
  }

  async getLatestSupplierRevisionNumber(supplier: string) {
    const latestRevision = await this.prismaService.supplierOrderHistoryRevision.findFirst({
      where: {
        supplier,
      },
      orderBy: [{ revisionNumber: 'desc' }, { snapshotTimestamp: 'desc' }],
      select: {
        revisionNumber: true,
      },
    });

    return latestRevision?.revisionNumber || 0;
  }

  async clearSupplierOrderHistory() {
    const deleteResult = await this.prismaService.supplierOrderHistoryRevision.deleteMany();
    return deleteResult.count;
  }

  async countJobsByStatus(status: AutomationJobStatus) {
    return this.prismaService.automationJob.count({
      where: {
        status,
      },
    });
  }

  async countJobsBySource(source: AutomationJobSource) {
    return this.prismaService.automationJob.count({
      where: {
        source,
      },
    });
  }
}
