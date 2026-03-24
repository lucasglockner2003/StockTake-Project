import { IsOptional, IsString } from 'class-validator';

export class UpdateAutomationJobErrorDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  message?: string;
}
