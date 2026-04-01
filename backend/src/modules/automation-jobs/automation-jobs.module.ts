import { Module } from '@nestjs/common';

import { AutomationExecutionController } from './automation-execution.controller';
import { DailyOrdersModule } from '../daily-orders/daily-orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { AutomationJobsController } from './automation-jobs.controller';
import { AutomationJobsRepository } from './automation-jobs.repository';
import { AutomationJobsService } from './automation-jobs.service';

@Module({
  imports: [DailyOrdersModule, InvoicesModule],
  controllers: [AutomationJobsController, AutomationExecutionController],
  providers: [AutomationJobsRepository, AutomationJobsService],
})
export class AutomationJobsModule {}
