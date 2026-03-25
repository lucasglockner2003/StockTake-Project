import { Module } from '@nestjs/common';

import { DailyOrdersModule } from '../daily-orders/daily-orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { AutomationJobsController } from './automation-jobs.controller';
import { AutomationJobsRepository } from './automation-jobs.repository';
import { AutomationJobsService } from './automation-jobs.service';

@Module({
  imports: [DailyOrdersModule, InvoicesModule],
  controllers: [AutomationJobsController],
  providers: [AutomationJobsRepository, AutomationJobsService],
})
export class AutomationJobsModule {}
