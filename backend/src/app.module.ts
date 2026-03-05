import { Module } from '@nestjs/common';
import { PrismaModule } from './sourceDB/database/prisma.module';
import { FinancialDataModule } from './modules/financial-data/financial-data.module';
import { SpendClassificationModule } from './modules/spend-classification/spend-classification.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthGuard } from './modules/auth/guards/auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    SpendClassificationModule,
    FinancialDataModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
