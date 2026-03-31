import { IsOptional, IsString, MaxLength } from 'class-validator';

export class IdempotencyKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
