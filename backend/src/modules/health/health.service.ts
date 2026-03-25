import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

type HealthStatusResponse = {
  service: string;
  status: 'ok' | 'degraded';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    connected: boolean;
    latencyMs: number;
  };
};

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async getStatus(): Promise<HealthStatusResponse> {
    const startedAt = Date.now();
    let databaseConnected = false;

    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }

    return {
      service: 'smartops-backend',
      status: databaseConnected ? 'ok' : 'degraded',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        connected: databaseConnected,
        latencyMs: Math.max(Date.now() - startedAt, 0),
      },
    };
  }
}
