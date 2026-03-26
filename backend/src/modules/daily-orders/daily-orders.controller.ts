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
import { CreateDailyOrdersFromPhotoDto } from './dto/create-daily-orders-from-photo.dto';
import { CreateDailyOrdersFromSuggestedOrderDto } from './dto/create-daily-orders-from-suggested-order.dto';
import { UpdateDailyOrderItemDto } from './dto/update-daily-order-item.dto';
import { DailyOrdersService } from './daily-orders.service';

@Controller('daily-orders')
export class DailyOrdersController {
  constructor(private readonly dailyOrdersService: DailyOrdersService) {}

  @Roles(Role.ADMIN, Role.CHEF, Role.MANAGER)
  @Get()
  listDailyOrders() {
    return this.dailyOrdersService.listDailyOrders();
  }

  @Roles(Role.ADMIN, Role.CHEF, Role.MANAGER)
  @Get('summary')
  getDailyOrdersSummary() {
    return this.dailyOrdersService.getDailyOrdersSummary();
  }

  @Roles(Role.ADMIN, Role.CHEF, Role.MANAGER)
  @Get('bot-service/status')
  getBotServiceStatus() {
    return this.dailyOrdersService.getBotServiceStatus();
  }

  @Roles(Role.ADMIN, Role.CHEF)
  @Post('from-photo')
  createDailyOrdersFromPhoto(
    @Body() createDailyOrdersFromPhotoDto: CreateDailyOrdersFromPhotoDto,
  ) {
    return this.dailyOrdersService.createDailyOrdersFromPhoto(
      createDailyOrdersFromPhotoDto,
    );
  }

  @Roles(Role.ADMIN, Role.CHEF)
  @Post('from-suggested-order')
  createDailyOrdersFromSuggestedOrder(
    @Body()
    createDailyOrdersFromSuggestedOrderDto: CreateDailyOrdersFromSuggestedOrderDto,
  ) {
    return this.dailyOrdersService.createDailyOrdersFromSuggestedOrder(
      createDailyOrdersFromSuggestedOrderDto,
    );
  }

  @Roles(Role.ADMIN, Role.CHEF)
  @Patch(':id/items/:itemIndex')
  updateDailyOrderItemQuantity(
    @Param('id') id: string,
    @Param('itemIndex', ParseIntPipe) itemIndex: number,
    @Body() updateDailyOrderItemDto: UpdateDailyOrderItemDto,
  ) {
    return this.dailyOrdersService.updateDailyOrderItemQuantity(
      id,
      itemIndex,
      updateDailyOrderItemDto,
    );
  }

  @Roles(Role.ADMIN, Role.CHEF)
  @Patch(':id/mark-ready')
  markDailyOrderReady(@Param('id') id: string) {
    return this.dailyOrdersService.markDailyOrderReady(id);
  }

  @Roles(Role.ADMIN, Role.CHEF)
  @Patch(':id/unlock')
  unlockDailyOrder(@Param('id') id: string) {
    return this.dailyOrdersService.unlockDailyOrder(id);
  }

  @Roles(Role.ADMIN, Role.CHEF)
  @Post(':id/run-bot-fill')
  runDailyOrderBotFill(@Param('id') id: string) {
    return this.dailyOrdersService.runDailyOrderBotFill(id);
  }

  @Roles(Role.ADMIN, Role.CHEF)
  @Post(':id/final-submit')
  finalSubmitDailyOrder(@Param('id') id: string) {
    return this.dailyOrdersService.finalSubmitDailyOrder(id);
  }

  @Roles(Role.ADMIN, Role.CHEF)
  @Delete('reset')
  resetDailyOrders() {
    return this.dailyOrdersService.resetDailyOrders();
  }
}
