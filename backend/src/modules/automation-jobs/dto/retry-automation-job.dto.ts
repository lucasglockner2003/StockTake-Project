import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RetryAutomationJobDto {
  @IsBoolean()
  @IsOptional()
  shouldFail?: boolean;

  @IsString()
  @IsOptional()
  failureMessage?: string;
}
