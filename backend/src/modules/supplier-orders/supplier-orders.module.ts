import { Module } from '@nestjs/common';
import { SupplierHistoryController } from './supplier-history.controller';
import { SupplierHistoryRepository } from './supplier-history.repository';
import { SupplierHistoryService } from './supplier-history.service';

@Module({
  controllers: [SupplierHistoryController],
  providers: [SupplierHistoryRepository, SupplierHistoryService],
  exports: [SupplierHistoryService],
})
export class SupplierOrdersModule {}
