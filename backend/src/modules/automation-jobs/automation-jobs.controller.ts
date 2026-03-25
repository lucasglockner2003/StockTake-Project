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
import { AutomationJobsService } from './automation-jobs.service';
import { CreateAutomationJobDto } from './dto/create-automation-job.dto';
import { RunAutomationJobDto } from './dto/run-automation-job.dto';
import { RetryAutomationJobDto } from './dto/retry-automation-job.dto';
import { UpdateAutomationJobErrorDto } from './dto/update-automation-job-error.dto';
import { UpdateAutomationJobNotesDto } from './dto/update-automation-job-notes.dto';
import { UpdateAutomationJobStatusDto } from './dto/update-automation-job-status.dto';

@Controller('automation-jobs')
export class AutomationJobsController {
  constructor(private readonly automationJobsService: AutomationJobsService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  listJobs() {
    return this.automationJobsService.listJobs();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('summary')
  getJobsSummary() {
    return this.automationJobsService.getJobsSummary();
  }

  @Roles(Role.ADMIN)
  @Post()
  createJob(@Body() createAutomationJobDto: CreateAutomationJobDto) {
    return this.automationJobsService.createJob(createAutomationJobDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateJobStatus(
    @Param('id') id: string,
    @Body() updateAutomationJobStatusDto: UpdateAutomationJobStatusDto,
  ) {
    return this.automationJobsService.updateJobStatus(
      id,
      updateAutomationJobStatusDto,
    );
  }

  @Roles(Role.ADMIN)
  @Patch(':id/error')
  updateJobError(
    @Param('id') id: string,
    @Body() updateAutomationJobErrorDto: UpdateAutomationJobErrorDto,
  ) {
    return this.automationJobsService.updateJobError(id, updateAutomationJobErrorDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/notes')
  updateJobNotes(
    @Param('id') id: string,
    @Body() updateAutomationJobNotesDto: UpdateAutomationJobNotesDto,
  ) {
    return this.automationJobsService.updateJobNotes(id, updateAutomationJobNotesDto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/reset')
  resetJob(@Param('id') id: string) {
    return this.automationJobsService.resetJob(id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/run')
  runJob(@Param('id') id: string, @Body() runAutomationJobDto: RunAutomationJobDto) {
    return this.automationJobsService.runJob(id, runAutomationJobDto);
  }

  @Roles(Role.ADMIN)
  @Post(':id/retry')
  retryJob(
    @Param('id') id: string,
    @Body() retryAutomationJobDto: RetryAutomationJobDto,
  ) {
    return this.automationJobsService.retryJob(id, retryAutomationJobDto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('supplier-history')
  listSupplierOrderHistory() {
    return this.automationJobsService.listSupplierOrderHistory();
  }

  @Roles(Role.ADMIN)
  @Delete('supplier-history')
  clearSupplierOrderHistory() {
    return this.automationJobsService.clearSupplierOrderHistory();
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  deleteJob(@Param('id') id: string) {
    return this.automationJobsService.deleteJob(id);
  }

  @Roles(Role.ADMIN)
  @Delete()
  deleteAllJobs() {
    return this.automationJobsService.deleteAllJobs();
  }
}
