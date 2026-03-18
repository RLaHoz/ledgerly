import { BadRequestException, Injectable } from '@nestjs/common';
import { resolveCurrentMonthRangeForUser } from '../../../common/utils/date-range.util';
import { PrismaService } from '../../../sourceDB/database/prisma.service';
import { TransactionsGroupingService } from './transactions-grouping.service';
import type {
  CurrentMonthGroupedResponse,
  TransactionsSyncSummary,
} from '../types/transactions.types';

@Injectable()
export class TransactionsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupingService: TransactionsGroupingService,
  ) {}

  async getCurrentMonthGrouped(input: {
    userId: string;
    includePending: boolean;
    sync: TransactionsSyncSummary;
  }): Promise<CurrentMonthGroupedResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        timeZone: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const range = resolveCurrentMonthRangeForUser(user.timeZone);

    const [transactions, categories, subcategories] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId: input.userId,
          occurredAt: {
            gte: range.fromUtc,
            lte: range.toUtc,
          },
          ...(input.includePending ? {} : { isPending: false }),
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          occurredAt: true,
          bookingDate: true,
          amountSigned: true,
          currency: true,
          merchant: true,
          description: true,
          isPending: true,
          classificationStatus: true,
          categoryId: true,
          subcategoryId: true,
          classifiedByRuleId: true,
        },
      }),
      this.prisma.budgetCategory.findMany({
        where: {
          userId: input.userId,
          isArchived: false,
        },
        select: {
          id: true,
          name: true,
          sortOrder: true,
        },
      }),
      this.prisma.budgetSubcategory.findMany({
        where: {
          userId: input.userId,
          isArchived: false,
        },
        select: {
          id: true,
          categoryId: true,
          name: true,
          sortOrder: true,
        },
      }),
    ]);

    const categoryById = new Map(
      categories.map((category) => [
        category.id,
        {
          name: category.name,
          sortOrder: category.sortOrder,
        },
      ]),
    );

    const subcategoryById = new Map(
      subcategories.map((subcategory) => [
        subcategory.id,
        {
          name: subcategory.name,
          sortOrder: subcategory.sortOrder,
        },
      ]),
    );

    return this.groupingService.buildGroupedResponse({
      from: range.fromUtc,
      to: range.toUtc,
      userTimeZone: range.timeZone,
      sync: input.sync,
      transactions: transactions.map((item) => ({
        id: item.id,
        occurredAt: item.occurredAt,
        bookingDate: item.bookingDate,
        amountSigned: Number(item.amountSigned),
        currency: item.currency,
        merchant: item.merchant,
        description: item.description,
        isPending: item.isPending,
        classificationStatus: item.classificationStatus,
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
        classifiedByRuleId: item.classifiedByRuleId,
      })),
      categoryById,
      subcategoryById,
    });
  }
}
