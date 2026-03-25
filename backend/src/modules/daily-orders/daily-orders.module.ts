import { Module } from '@nestjs/common';

import { SupplierOrdersModule } from '../supplier-orders/supplier-orders.module';
import { DailyOrdersBotClient } from './daily-orders-bot.client';
import { DailyOrdersController } from './daily-orders.controller';
import { DailyOrdersRepository } from './daily-orders.repository';
import { DailyOrdersService } from './daily-orders.service';

@Module({
  imports: [SupplierOrdersModule],
  controllers: [DailyOrdersController],
  providers: [
    DailyOrdersRepository,
    DailyOrdersService,
    DailyOrdersBotClient,
  ],
  exports: [DailyOrdersBotClient],
})
export class DailyOrdersModule {}
