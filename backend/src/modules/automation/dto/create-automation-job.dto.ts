import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  AUTOMATION_JOB_SOURCE_VALUES,
  SUPPLIER_ORDER_HISTORY_STATUS_VALUES,
} from '../automation.types';

const AUTOMATION_JOB_SOURCE_OPTIONS = Object.values(AUTOMATION_JOB_SOURCE_VALUES);
const SUPPLIER_HISTORY_STATUS_OPTIONS = Object.values(
  SUPPLIER_ORDER_HISTORY_STATUS_VALUES,
);

export class SupplierOrderSnapshotItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  @IsOptional()
  unit?: string;
}

export class SupplierOrderSnapshotDto {
  @IsString()
  @IsOptional()
  supplier?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierOrderSnapshotItemDto)
  items!: SupplierOrderSnapshotItemDto[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalQuantity?: number;

  @IsString()
  @IsOptional()
  timestamp?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  revisionNumber?: number;
}

export class SupplierOrderMetadataDto {
  @IsString()
  @IsOptional()
  supplier?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  itemCount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalQuantity?: number;

  @IsString()
  @IsOptional()
  @IsIn(SUPPLIER_HISTORY_STATUS_OPTIONS)
  status?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  attempts?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  revisionNumber?: number;

  @ValidateNested()
  @Type(() => SupplierOrderSnapshotDto)
  @IsOptional()
  snapshot?: SupplierOrderSnapshotDto;

  @IsString()
  @IsOptional()
  sentAt?: string;

  @IsString()
  @IsOptional()
  lastSentAt?: string;
}

export class CreateAutomationJobMetadataDto {
  @ValidateNested()
  @Type(() => SupplierOrderMetadataDto)
  @IsOptional()
  supplierOrder?: SupplierOrderMetadataDto;
}

export class CreateAutomationJobItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence!: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  itemId?: number;

  @IsString()
  @IsNotEmpty()
  itemName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  @IsOptional()
  @IsIn(AUTOMATION_JOB_SOURCE_OPTIONS)
  source?: string;

  @IsString()
  @IsOptional()
  supplier?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  currentStock?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  idealStock?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  orderAmount?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  area?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  rawLine?: string;
}

export class CreateAutomationJobDto {
  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  @IsIn(AUTOMATION_JOB_SOURCE_OPTIONS)
  source?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  attemptCount?: number;

  @IsString()
  @IsOptional()
  lastError?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAutomationJobItemDto)
  items!: CreateAutomationJobItemDto[];

  @ValidateNested()
  @Type(() => CreateAutomationJobMetadataDto)
  @IsOptional()
  metadata?: CreateAutomationJobMetadataDto;
}
