import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

import { Public } from '../../common/auth/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async getStatus(@Res({ passthrough: true }) response: Response) {
    const healthStatus = await this.healthService.getStatus();

    if (healthStatus.status !== 'ok') {
      response.status(503);
    }

    return healthStatus;
  }
}
