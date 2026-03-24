import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { CreateInvoiceIntakeDto } from './dto/create-invoice-intake.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Roles(Role.ADMIN)
  @Post('intake')
  intakeInvoice(@Body() createInvoiceIntakeDto: CreateInvoiceIntakeDto) {
    return this.invoicesService.intakeInvoice(createInvoiceIntakeDto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  listInvoices() {
    return this.invoicesService.listInvoices();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('summary')
  getInvoicesSummary() {
    return this.invoicesService.getInvoicesSummary();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get(':id')
  getInvoiceById(@Param('id') id: string) {
    return this.invoicesService.getInvoiceById(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/retry')
  retryInvoice(@Param('id') id: string) {
    return this.invoicesService.retryInvoice(id);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  deleteInvoice(@Param('id') id: string) {
    return this.invoicesService.deleteInvoice(id);
  }
}
