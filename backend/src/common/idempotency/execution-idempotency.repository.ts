import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  ExecutionIdempotencyOperation,
  Prisma,
} from '../../generated/prisma/client';

export type ExecutionIdempotencyRecord = NonNullable<
  Awaited<ReturnType<PrismaService['executionIdempotency']['findUnique']>>
>;

type ExecutionIdempotencyUpdateData = Parameters<
  PrismaService['executionIdempotency']['update']
>[0]['data'];

@Injectable()
export class ExecutionIdempotencyRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findByKey(
    operation: ExecutionIdempotencyOperation,
    entityId: string,
    idempotencyKey: string,
  ) {
    return this.prismaService.executionIdempotency.findUnique({
      where: {
        operation_entityId_idempotencyKey: {
          operation,
          entityId,
          idempotencyKey,
        },
      },
    });
  }

  async createPending(
    operation: ExecutionIdempotencyOperation,
    entityId: string,
    idempotencyKey: string,
  ) {
    try {
      const record = await this.prismaService.executionIdempotency.create({
        data: {
          operation,
          entityId,
          idempotencyKey,
        },
      });

      return {
        created: true,
        record,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const record = await this.findByKey(operation, entityId, idempotencyKey);

        if (record) {
          return {
            created: false,
            record,
          };
        }
      }

      throw error;
    }
  }

  updateById(
    id: string,
    data: ExecutionIdempotencyUpdateData,
  ) {
    return this.prismaService.executionIdempotency.update({
      where: {
        id,
      },
      data,
    });
  }

  deleteById(id: string) {
    return this.prismaService.executionIdempotency.delete({
      where: {
        id,
      },
    });
  }
}
