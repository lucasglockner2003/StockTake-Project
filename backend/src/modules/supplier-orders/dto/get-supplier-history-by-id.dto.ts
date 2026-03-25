import { IsNotEmpty, IsString } from 'class-validator';

export class GetSupplierHistoryByIdDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
