import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Min } from 'class-validator';
import { IsNumber } from 'class-validator';

export class StockItemSnapshotDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsString()
  unit!: string;

  @IsString()
  area!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  idealStock!: number;

  @IsOptional()
  @IsBoolean()
  critical?: boolean;
}
