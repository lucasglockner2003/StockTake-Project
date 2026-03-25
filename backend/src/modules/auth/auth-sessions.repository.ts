import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthSessionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createSession(data: {
    id: string;
    userId: string;
    accessTokenVersion?: number;
    refreshTokenHash: string;
    expiresAt: Date;
    lastUsedAt?: Date;
    userAgent: string;
    ipAddress: string;
  }) {
    return this.prismaService.authSession.create({
      data,
    });
  }

  findSessionById(sessionId: string) {
    return this.prismaService.authSession.findUnique({
      where: {
        id: sessionId,
      },
    });
  }

  updateSession(
    sessionId: string,
    data: {
      refreshTokenHash?: string;
      accessTokenVersion?: number;
      expiresAt?: Date;
      revokedAt?: Date | null;
      lastUsedAt?: Date | null;
      userAgent?: string;
      ipAddress?: string;
    },
  ) {
    return this.prismaService.authSession.update({
      where: {
        id: sessionId,
      },
      data,
    });
  }

  revokeSession(sessionId: string, revokedAt: Date) {
    return this.prismaService.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    });
  }
}
