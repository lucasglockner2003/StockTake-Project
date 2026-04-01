import { Controller, Delete, Param, Post } from '@nestjs/common';

import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AutomationJobsService } from './automation-jobs.service';

@Controller('automation')
export class AutomationExecutionController {
  constructor(private readonly automationJobsService: AutomationJobsService) {}

  @Roles(Role.ADMIN)
  @Post('run-job/:id')
  runJob(@Param('id') id: string) {
    return this.automationJobsService.runJob(id, {});
  }

  @Roles(Role.ADMIN)
  @Delete('job/:id')
  deleteJob(@Param('id') id: string) {
    return this.automationJobsService.deleteJob(id);
  }
}
