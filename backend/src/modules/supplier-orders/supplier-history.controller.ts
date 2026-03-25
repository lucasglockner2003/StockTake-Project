import { Controller, Delete, Get, Param } from '@nestjs/common';

import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { GetSupplierHistoryByIdDto } from './dto/get-supplier-history-by-id.dto';
import { GetSupplierHistoryBySupplierDto } from './dto/get-supplier-history-by-supplier.dto';
import { SupplierHistoryService } from './supplier-history.service';

@Controller('supplier-history')
export class SupplierHistoryController {
  constructor(private readonly supplierHistoryService: SupplierHistoryService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  listHistory() {
    return this.supplierHistoryService.listHistory();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('by-supplier/:supplierId')
  getHistoryBySupplier(
    @Param() getSupplierHistoryBySupplierDto: GetSupplierHistoryBySupplierDto,
  ) {
    return this.supplierHistoryService.getHistoryBySupplier(
      getSupplierHistoryBySupplierDto,
    );
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get(':id')
  getHistoryById(@Param() getSupplierHistoryByIdDto: GetSupplierHistoryByIdDto) {
    return this.supplierHistoryService.getHistoryById(getSupplierHistoryByIdDto);
  }

  @Roles(Role.ADMIN)
  @Delete()
  clearHistory() {
    return this.supplierHistoryService.clearHistory();
  }
}
