import { Module } from '@nestjs/common';
import { SpendClassificationModule } from '../spend-classification/spend-classification.module';
import { CsvParserService } from './services/csv-parser.service';
import { FinancialDataController } from './financial-data.controller';
import { FinancialDataService } from './services/financial-data.service';

@Module({
  imports: [SpendClassificationModule],
  controllers: [FinancialDataController],
  providers: [FinancialDataService, CsvParserService],
  exports: [FinancialDataService],
})
export class FinancialDataModule {}
