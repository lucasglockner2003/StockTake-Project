import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { StockItemsService } from './stock-items.service';

@Controller('stock-items')
export class StockItemsController {
  constructor(private readonly stockItemsService: StockItemsService) {}

  @Roles(Role.ADMIN, Role.CHEF, Role.MANAGER)
  @Get()
  listStockItems() {
    return this.stockItemsService.listStockItems();
  }

  @Roles(Role.ADMIN)
  @Post()
  createStockItem(@Body() createStockItemDto: CreateStockItemDto) {
    return this.stockItemsService.createStockItem(createStockItemDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  updateStockItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStockItemDto: UpdateStockItemDto,
  ) {
    return this.stockItemsService.updateStockItem(id, updateStockItemDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  deleteStockItem(@Param('id', ParseIntPipe) id: number) {
    return this.stockItemsService.deleteStockItem(id);
  }
}
