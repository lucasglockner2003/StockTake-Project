import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class SuggestedOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  orderAmount!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  supplier?: string;
}

export class CreateDailyOrdersFromSuggestedOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SuggestedOrderItemDto)
  items!: SuggestedOrderItemDto[];
}
