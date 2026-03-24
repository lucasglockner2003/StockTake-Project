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

class PhotoOrderEntryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemId!: number;

  @IsString()
  itemName!: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  supplier?: string;
}

export class CreateDailyOrdersFromPhotoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PhotoOrderEntryDto)
  entries!: PhotoOrderEntryDto[];
}
