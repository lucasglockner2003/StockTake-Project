import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateStockTakeItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number | null;
}
