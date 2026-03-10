import { Module } from '@nestjs/common';
import { PrismaModule } from './sourceDB/database/prisma.module';
import { SpendClassificationModule } from './modules/spend-classification/spend-classification.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './modules/categories/categories.module';
import { RulesModule } from './modules/rules/rules.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    PrismaModule,
    SpendClassificationModule,
    CategoriesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    RulesModule,
    TransactionsModule,
  ],
})
export class AppModule {}
