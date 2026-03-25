import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateStockItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  idealStock?: number;

  @IsOptional()
  @IsBoolean()
  critical?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
