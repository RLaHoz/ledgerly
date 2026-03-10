import { Module } from '@nestjs/common';
import { CdrAuthModule } from '../cdr-auth/cdr-auth.module';
import { PrismaModule } from '../../sourceDB/database/prisma.module';
import { RulesModule } from '../rules/rules.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsClassificationService } from './services/transactions-classification.service';
import { TransactionsGroupingService } from './services/transactions-grouping.service';
import { TransactionsQueryService } from './services/transactions-query.service';
import { TransactionsSyncService } from './services/transactions-sync.service';

@Module({
  imports: [PrismaModule, CdrAuthModule, RulesModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsSyncService,
    TransactionsQueryService,
    TransactionsGroupingService,
    TransactionsClassificationService,
  ],
  exports: [TransactionsSyncService, TransactionsQueryService],
})
export class TransactionsModule {}
