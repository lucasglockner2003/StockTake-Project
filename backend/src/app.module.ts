import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './common/prisma/prisma.module';
import { validateEnvironment } from './config/environment.validation';
import { AutomationJobsModule } from './modules/automation-jobs/automation-jobs.module';
import { AuthModule } from './modules/auth/auth.module';
import { DailyOrdersModule } from './modules/daily-orders/daily-orders.module';
import { HealthModule } from './modules/health/health.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { StockItemsModule } from './modules/stock-items/stock-items.module';
import { StockTakeModule } from './modules/stock-take/stock-take.module';
import { SupplierOrdersModule } from './modules/supplier-orders/supplier-orders.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AutomationJobsModule,
    DailyOrdersModule,
    InvoicesModule,
    UsersModule,
    StockItemsModule,
    StockTakeModule,
    SupplierOrdersModule,
  ],
})
export class AppModule {}
