import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';

import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { UpdateStockTakeItemDto } from './dto/update-stock-take-item.dto';
import { StockTakeService } from './stock-take.service';

@Roles(Role.ADMIN, Role.CHEF)
@Controller('stock-take')
export class StockTakeController {
  constructor(private readonly stockTakeService: StockTakeService) {}

  @Get('today')
  getTodayStockTake() {
    return this.stockTakeService.getTodayStockTake();
  }

  @Put('items/:itemId')
  updateTodayStockTakeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateStockTakeItemDto: UpdateStockTakeItemDto,
  ) {
    return this.stockTakeService.updateTodayStockTakeItem(itemId, updateStockTakeItemDto);
  }

  @Post('reset')
  resetTodayStockTake() {
    return this.stockTakeService.resetTodayStockTake();
  }

  @Get('summary')
  getTodaySummary() {
    return this.stockTakeService.getTodaySummary();
  }
}
