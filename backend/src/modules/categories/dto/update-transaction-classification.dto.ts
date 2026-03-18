import { IsOptional, IsUUID } from 'class-validator';

export class UpdateTransactionClassificationDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string | null;
}
