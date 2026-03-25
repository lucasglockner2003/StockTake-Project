import { IsBoolean, IsIn, IsOptional } from 'class-validator';

import { AUTOMATION_JOB_STATUS_VALUES } from '../automation-jobs.types';

const AUTOMATION_JOB_STATUS_OPTIONS = Object.values(AUTOMATION_JOB_STATUS_VALUES);

export class UpdateAutomationJobStatusDto {
  @IsIn(AUTOMATION_JOB_STATUS_OPTIONS)
  status!: string;

  @IsBoolean()
  @IsOptional()
  incrementAttempts?: boolean;
}
