import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RunAutomationJobDto {
  @IsBoolean()
  @IsOptional()
  shouldFail?: boolean;

  @IsString()
  @IsOptional()
  failureMessage?: string;
}
