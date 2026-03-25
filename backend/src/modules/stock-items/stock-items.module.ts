import { Module } from '@nestjs/common';

import { StockItemsController } from './stock-items.controller';
import { StockItemsRepository } from './stock-items.repository';
import { StockItemsService } from './stock-items.service';

@Module({
  controllers: [StockItemsController],
  providers: [StockItemsRepository, StockItemsService],
  exports: [StockItemsRepository, StockItemsService],
})
export class StockItemsModule {}
