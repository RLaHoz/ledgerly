/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import type {
  CurrentMonthGroupedResponse,
  GroupedCategoryBucket,
  GroupedSubcategoryBucket,
  TransactionListItem,
} from '../types/transactions.types';

type GroupableTransaction = {
  id: string;
  occurredAt: Date;
  bookingDate: Date | null;
  amountSigned: number;
  currency: string;
  merchant: string | null;
  description: string;
  isPending: boolean;
  classificationStatus: 'AUTO' | 'MANUAL' | 'UNCLASSIFIED';
  categoryId: string | null;
  subcategoryId: string | null;
  classifiedByRuleId: string | null;
};

@Injectable()
export class TransactionsGroupingService {
  private static readonly UNCATEGORIZED_LABEL = 'Uncategorized';

  buildGroupedResponse(input: {
    from: Date;
    to: Date;
    userTimeZone: string;
    sync: CurrentMonthGroupedResponse['sync'];
    transactions: GroupableTransaction[];
    categoryById: Map<string, { name: string; sortOrder: number }>;
    subcategoryById: Map<
      string,
      {
        name: string;
        sortOrder: number;
      }
    >;
  }): CurrentMonthGroupedResponse {
    const categoryBuckets = new Map<
      string,
      GroupedCategoryBucket & { sortOrder: number; sortName: string }
    >();

    let debitTotal = 0;
    let creditTotal = 0;

    for (const tx of input.transactions) {
      const amountSigned = Number(tx.amountSigned);
      if (amountSigned < 0) {
        debitTotal += Math.abs(amountSigned);
      } else if (amountSigned > 0) {
        creditTotal += amountSigned;
      }

      const categoryKey = tx.categoryId ?? '__uncategorized__';
      const categoryMetadata = tx.categoryId
        ? input.categoryById.get(tx.categoryId)
        : undefined;
      const categoryName =
        categoryMetadata?.name ??
        TransactionsGroupingService.UNCATEGORIZED_LABEL;
      const categorySortOrder =
        categoryMetadata?.sortOrder ?? Number.MAX_SAFE_INTEGER;

      let categoryBucket = categoryBuckets.get(categoryKey);
      if (!categoryBucket) {
        categoryBucket = {
          categoryId: tx.categoryId,
          name: categoryName,
          txCount: 0,
          debitTotal: 0,
          creditTotal: 0,
          subcategories: [],
          sortOrder: categorySortOrder,
          sortName: categoryName.toLowerCase(),
        };
        categoryBuckets.set(categoryKey, categoryBucket);
      }

      const subcategoryKey = tx.subcategoryId ?? '__uncategorized__';
      const subcategoryMetadata = tx.subcategoryId
        ? input.subcategoryById.get(tx.subcategoryId)
        : undefined;
      const subcategoryName =
        subcategoryMetadata?.name ??
        TransactionsGroupingService.UNCATEGORIZED_LABEL;
      const subcategorySortOrder =
        subcategoryMetadata?.sortOrder ?? Number.MAX_SAFE_INTEGER;

      let subcategoryBucket = categoryBucket.subcategories.find(
        (item) =>
          (item.subcategoryId ?? '__uncategorized__') === subcategoryKey,
      ) as
        | (GroupedSubcategoryBucket & { sortOrder: number; sortName: string })
        | undefined;

      if (!subcategoryBucket) {
        subcategoryBucket = {
          subcategoryId: tx.subcategoryId,
          name: subcategoryName,
          txCount: 0,
          debitTotal: 0,
          creditTotal: 0,
          transactions: [],
          sortOrder: subcategorySortOrder,
          sortName: subcategoryName.toLowerCase(),
        };
        categoryBucket.subcategories.push(subcategoryBucket);
      }

      const txItem: TransactionListItem = {
        id: tx.id,
        occurredAt: tx.occurredAt.toISOString(),
        bookingDate: tx.bookingDate ? tx.bookingDate.toISOString() : undefined,
        amountSigned,
        currency: tx.currency,
        merchant: tx.merchant ?? undefined,
        description: tx.description,
        isPending: tx.isPending,
        classificationStatus: tx.classificationStatus,
        categoryId: tx.categoryId,
        subcategoryId: tx.subcategoryId,
        classifiedByRuleId: tx.classifiedByRuleId,
      };

      subcategoryBucket.transactions.push(txItem);
      subcategoryBucket.txCount += 1;
      categoryBucket.txCount += 1;

      if (amountSigned < 0) {
        const absoluteDebit = Math.abs(amountSigned);
        subcategoryBucket.debitTotal += absoluteDebit;
        categoryBucket.debitTotal += absoluteDebit;
      } else if (amountSigned > 0) {
        subcategoryBucket.creditTotal += amountSigned;
        categoryBucket.creditTotal += amountSigned;
      }
    }

    const categories = [...categoryBuckets.values()]
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.sortName.localeCompare(right.sortName);
      })
      .map((category) => {
        const sortedSubcategories = [...category.subcategories]
          .sort((left, right) => {
            const leftWithSort = left as GroupedSubcategoryBucket & {
              sortOrder: number;
              sortName: string;
            };
            const rightWithSort = right as GroupedSubcategoryBucket & {
              sortOrder: number;
              sortName: string;
            };
            if (leftWithSort.sortOrder !== rightWithSort.sortOrder) {
              return leftWithSort.sortOrder - rightWithSort.sortOrder;
            }
            return leftWithSort.sortName.localeCompare(rightWithSort.sortName);
          })
          .map((subcategory) => {
            const {
              sortOrder: _sortOrder,
              sortName: _sortName,
              ...output
            } = subcategory as GroupedSubcategoryBucket & {
              sortOrder: number;
              sortName: string;
            };

            return {
              ...output,
              transactions: [...output.transactions].sort(
                (leftTx, rightTx) =>
                  new Date(rightTx.occurredAt).getTime() -
                  new Date(leftTx.occurredAt).getTime(),
              ),
            };
          });

        const {
          sortOrder: _sortOrder,
          sortName: _sortName,
          ...output
        } = category;

        return {
          ...output,
          subcategories: sortedSubcategories,
        };
      });

    const txCount = input.transactions.length;

    return {
      range: {
        from: input.from.toISOString(),
        to: input.to.toISOString(),
        userTimeZone: input.userTimeZone,
      },
      sync: input.sync,
      totals: {
        txCount,
        debitTotal,
        creditTotal,
        net: creditTotal - debitTotal,
      },
      categories,
    };
  }
}
