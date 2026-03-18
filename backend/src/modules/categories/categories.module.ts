import { Module } from '@nestjs/common';
import { SpendClassificationModule } from '../spend-classification/spend-classification.module';
import { CategoriesController } from './categories.controller';
import { CategoryCsvParserService } from './services/category-csv-parser.service';
import { CategoryManagementService } from './services/category-management.service';
import { CategoryTransactionImportService } from './services/category-transaction-import.service';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [SpendClassificationModule, RulesModule],
  controllers: [CategoriesController],
  providers: [
    CategoryCsvParserService,
    CategoryManagementService,
    CategoryTransactionImportService,
  ],
  exports: [CategoryManagementService, CategoryTransactionImportService],
})
export class CategoriesModule {}
