import { Module } from '@nestjs/common';
import { SpendClassificationService } from './services/spend-classification.service';

@Module({
  providers: [SpendClassificationService],
  exports: [SpendClassificationService],
})
export class SpendClassificationModule {}
