import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AutomationService } from './automation.service';
import { CreateAutomationJobDto } from './dto/create-automation-job.dto';
import { RunAutomationJobDto } from './dto/run-automation-job.dto';
import { UpdateAutomationJobErrorDto } from './dto/update-automation-job-error.dto';
import { UpdateAutomationJobNotesDto } from './dto/update-automation-job-notes.dto';
import { UpdateAutomationJobStatusDto } from './dto/update-automation-job-status.dto';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('jobs')
  listJobs() {
    return this.automationService.listJobs();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('jobs/summary')
  getJobsSummary() {
    return this.automationService.getJobsSummary();
  }

  @Roles(Role.ADMIN)
  @Post('jobs')
  createJob(@Body() createAutomationJobDto: CreateAutomationJobDto) {
    return this.automationService.createJob(createAutomationJobDto);
  }

  @Roles(Role.ADMIN)
  @Patch('jobs/:id/status')
  updateJobStatus(
    @Param('id') id: string,
    @Body() updateAutomationJobStatusDto: UpdateAutomationJobStatusDto,
  ) {
    return this.automationService.updateJobStatus(id, updateAutomationJobStatusDto);
  }

  @Roles(Role.ADMIN)
  @Patch('jobs/:id/error')
  updateJobError(
    @Param('id') id: string,
    @Body() updateAutomationJobErrorDto: UpdateAutomationJobErrorDto,
  ) {
    return this.automationService.updateJobError(id, updateAutomationJobErrorDto);
  }

  @Roles(Role.ADMIN)
  @Patch('jobs/:id/notes')
  updateJobNotes(
    @Param('id') id: string,
    @Body() updateAutomationJobNotesDto: UpdateAutomationJobNotesDto,
  ) {
    return this.automationService.updateJobNotes(id, updateAutomationJobNotesDto);
  }

  @Roles(Role.ADMIN)
  @Patch('jobs/:id/reset')
  resetJob(@Param('id') id: string) {
    return this.automationService.resetJob(id);
  }

  @Roles(Role.ADMIN)
  @Delete('jobs/:id')
  deleteJob(@Param('id') id: string) {
    return this.automationService.deleteJob(id);
  }

  @Roles(Role.ADMIN)
  @Delete('jobs')
  deleteAllJobs() {
    return this.automationService.deleteAllJobs();
  }

  @Roles(Role.ADMIN)
  @Post('jobs/:id/run')
  runJob(@Param('id') id: string, @Body() runAutomationJobDto: RunAutomationJobDto) {
    return this.automationService.runJob(id, runAutomationJobDto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('supplier-history')
  listSupplierOrderHistory() {
    return this.automationService.listSupplierOrderHistory();
  }

  @Roles(Role.ADMIN)
  @Delete('supplier-history')
  clearSupplierOrderHistory() {
    return this.automationService.clearSupplierOrderHistory();
  }
}
