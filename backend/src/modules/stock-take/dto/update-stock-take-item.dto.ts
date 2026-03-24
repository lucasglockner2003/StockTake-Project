import { Type } from 'class-transformer';
import {
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

import { StockItemSnapshotDto } from './stock-item-snapshot.dto';

export class UpdateStockTakeItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number | null;

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => StockItemSnapshotDto)
  stockItem!: StockItemSnapshotDto;
}
