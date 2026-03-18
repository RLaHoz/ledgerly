import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { BulkUpdateTransactionClassificationItemDto } from './bulk-update-transaction-classification.dto';

export class AssignTransactionsOptionsDto {
  @IsOptional()
  @IsBoolean()
  atomic = true;

  @IsOptional()
  @IsBoolean()
  requireSubcategory = true;
}

export class AssignBudgetCategoryItemDto {
  @IsUUID()
  categoryId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  plannedAmount!: number;
}

export class AssignBudgetSubcategoryItemDto {
  @IsUUID()
  subcategoryId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  plannedAmount!: number;
}

export class AssignTransactionsBudgetPlanDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'monthYm must be YYYY-MM',
  })
  monthYm?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  monthlyTarget?: number | null;

  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => AssignBudgetCategoryItemDto)
  categoryBudgets: AssignBudgetCategoryItemDto[] = [];

  @IsArray()
  @ArrayMaxSize(800)
  @ValidateNested({ each: true })
  @Type(() => AssignBudgetSubcategoryItemDto)
  subcategoryBudgets: AssignBudgetSubcategoryItemDto[] = [];
}

export class AssignTransactionsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateTransactionClassificationItemDto)
  items: BulkUpdateTransactionClassificationItemDto[] = [];

  @IsOptional()
  @ValidateNested()
  @Type(() => AssignTransactionsOptionsDto)
  options?: AssignTransactionsOptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssignTransactionsBudgetPlanDto)
  budgetPlan?: AssignTransactionsBudgetPlanDto;
}
