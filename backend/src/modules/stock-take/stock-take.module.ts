import { Module } from '@nestjs/common';

import { StockTakeController } from './stock-take.controller';
import { StockTakeRepository } from './stock-take.repository';
import { StockTakeService } from './stock-take.service';

@Module({
  controllers: [StockTakeController],
  providers: [StockTakeRepository, StockTakeService],
})
export class StockTakeModule {}
