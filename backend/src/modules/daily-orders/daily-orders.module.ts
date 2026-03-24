import { Module } from '@nestjs/common';

import { DailyOrdersBotClient } from './daily-orders-bot.client';
import { DailyOrdersController } from './daily-orders.controller';
import { DailyOrdersRepository } from './daily-orders.repository';
import { DailyOrdersService } from './daily-orders.service';

@Module({
  controllers: [DailyOrdersController],
  providers: [
    DailyOrdersRepository,
    DailyOrdersService,
    DailyOrdersBotClient,
  ],
})
export class DailyOrdersModule {}
