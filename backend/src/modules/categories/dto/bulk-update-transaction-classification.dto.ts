import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UpdateTransactionClassificationDto } from './update-transaction-classification.dto';

export class BulkUpdateTransactionClassificationItemDto extends UpdateTransactionClassificationDto {
  @IsUUID()
  transactionId!: string;
}

export class BulkUpdateTransactionClassificationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateTransactionClassificationItemDto)
  items!: BulkUpdateTransactionClassificationItemDto[];
}
