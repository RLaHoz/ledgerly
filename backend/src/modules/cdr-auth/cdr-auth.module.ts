import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CdrClient } from '../cdr-sandbox/cdr.client';
import { CdrModule } from '../cdr-sandbox/cdr.module';
import {
  BANK_AUTH_CLIENT,
  type BankAuthClient,
  resolveCdrMode,
} from './bank-auth.types';
import { MockCdrClient } from './mock-cdr.client';
import { BasiqClient } from './basiq.client';

@Module({
  imports: [ConfigModule, HttpModule, CdrModule],
  providers: [
    MockCdrClient,
    BasiqClient,
    {
      provide: BANK_AUTH_CLIENT,
      inject: [ConfigService, CdrClient, MockCdrClient, BasiqClient],
      useFactory: (
        config: ConfigService,
        sandboxClient: CdrClient,
        mockClient: MockCdrClient,
        basiqClient: BasiqClient,
      ): BankAuthClient => {
        const cdrMode = resolveCdrMode(config.get<string>('CDR_MODE'));
        if (cdrMode === 'mock') {
          return mockClient;
        }
        if (cdrMode === 'basiq') {
          return basiqClient;
        }

        return sandboxClient;
      },
    },
  ],
  exports: [BANK_AUTH_CLIENT],
})
export class CdrAuthModule {}
