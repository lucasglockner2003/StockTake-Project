import { Module } from '@nestjs/common';

import { ExecutionIdempotencyRepository } from '../../common/idempotency/execution-idempotency.repository';
import { InvoicesBotClient } from './invoices-bot.client';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';

@Module({
  controllers: [InvoicesController],
  providers: [
    ExecutionIdempotencyRepository,
    InvoicesBotClient,
    InvoicesRepository,
    InvoicesService,
  ],
  exports: [InvoicesBotClient],
})
export class InvoicesModule {}
