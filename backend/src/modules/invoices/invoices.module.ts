import { Module } from '@nestjs/common';

import { InvoicesBotClient } from './invoices-bot.client';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesBotClient, InvoicesRepository, InvoicesService],
  exports: [InvoicesBotClient],
})
export class InvoicesModule {}
