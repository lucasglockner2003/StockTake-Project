import { IsNotEmpty, IsString } from 'class-validator';

export class GetSupplierHistoryBySupplierDto {
  @IsString()
  @IsNotEmpty()
  supplierId!: string;
}
