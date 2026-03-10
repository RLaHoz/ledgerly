import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { GetCurrentMonthGroupedQueryDto } from './dto/get-current-month-grouped-query.dto';
import { RunCurrentMonthSyncDto } from './dto/run-current-month-sync.dto';
import { TransactionsQueryService } from './services/transactions-query.service';
import { TransactionsSyncService } from './services/transactions-sync.service';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsSyncService: TransactionsSyncService,
    private readonly transactionsQueryService: TransactionsQueryService,
  ) {}

  @Get('current')
  async getCurrentMonthGrouped(
    @CurrentUserId() userId: string,
    @Query() query: GetCurrentMonthGroupedQueryDto,
  ) {
    const sync = await this.transactionsSyncService.syncCurrentMonthIfNeeded({
      userId,
      includePending: query.includePending ?? false,
      forceSync: query.forceSync ?? false,
      ttlMinutes: query.ttlMinutes,
    });

    return this.transactionsQueryService.getCurrentMonthGrouped({
      userId,
      includePending: query.includePending ?? false,
      sync,
    });
  }

  @Post('sync')
  async syncCurrentMonth(
    @CurrentUserId() userId: string,
    @Body() dto: RunCurrentMonthSyncDto,
  ) {
    /**
     * Use this endpoint when the user explicitly requests fresh bank data
     * (e.g. pull-to-refresh / 'Sync now' button) to bypass TTL cache and
     * fetch latest transactions immediately.
     */
    return this.transactionsSyncService.forceSyncCurrentMonth({
      userId,
      includePending: dto.includePending ?? false,
    });
  }
}
