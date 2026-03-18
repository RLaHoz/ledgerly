jest.mock(
  '../../../sourceDB/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

jest.mock(
  'src/sourceDB/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

import { BadRequestException } from '@nestjs/common';
import { CategoryManagementService } from './category-management.service';

type MutableTransactionRecord = {
  id: string;
  userId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  classificationStatus: 'AUTO' | 'MANUAL' | 'UNCLASSIFIED';
  updatedAt: Date;
};

type CategoryRecord = {
  id: string;
  userId: string;
  name: string;
  isArchived: boolean;
};

type SubcategoryRecord = {
  id: string;
  categoryId: string;
  userId: string;
  name: string;
  isArchived: boolean;
};

type UserRecord = {
  id: string;
  timeZone: string;
  baseCurrency: string;
};

type BudgetMonthRecord = {
  id: string;
  userId: string;
  monthYm: string;
  plannedTotal: number;
  currency: string;
};

type CategoryBudgetRecord = {
  budgetMonthId: string;
  categoryId: string;
  plannedAmount: number;
};

type SubcategoryBudgetRecord = {
  budgetMonthId: string;
  subcategoryId: string;
  plannedAmount: number;
};

class PrismaOperation<T> implements PromiseLike<T> {
  constructor(private readonly runner: () => Promise<T> | T) {}

  run(): Promise<T> {
    return Promise.resolve(this.runner());
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

const createFixture = () => {
  const state: {
    users: UserRecord[];
    transactions: MutableTransactionRecord[];
    categories: CategoryRecord[];
    subcategories: SubcategoryRecord[];
    budgetMonths: BudgetMonthRecord[];
    categoryBudgets: CategoryBudgetRecord[];
    subcategoryBudgets: SubcategoryBudgetRecord[];
    failOnUpdateTxIds: Set<string>;
  } = {
    users: [
      {
        id: 'user-1',
        timeZone: 'Australia/Brisbane',
        baseCurrency: 'USD',
      },
      {
        id: 'user-2',
        timeZone: 'UTC',
        baseCurrency: 'USD',
      },
    ],
    transactions: [
      {
        id: 'tx-1',
        userId: 'user-1',
        categoryId: null,
        subcategoryId: null,
        classificationStatus: 'UNCLASSIFIED',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
      {
        id: 'tx-2',
        userId: 'user-1',
        categoryId: null,
        subcategoryId: null,
        classificationStatus: 'UNCLASSIFIED',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
      {
        id: 'tx-other-user',
        userId: 'user-2',
        categoryId: null,
        subcategoryId: null,
        classificationStatus: 'UNCLASSIFIED',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
    ],
    categories: [
      {
        id: 'cat-food',
        userId: 'user-1',
        name: 'Food',
        isArchived: false,
      },
      {
        id: 'cat-transport',
        userId: 'user-1',
        name: 'Transport',
        isArchived: false,
      },
    ],
    subcategories: [
      {
        id: 'sub-groceries',
        categoryId: 'cat-food',
        userId: 'user-1',
        name: 'Groceries',
        isArchived: false,
      },
      {
        id: 'sub-uber',
        categoryId: 'cat-transport',
        userId: 'user-1',
        name: 'Ride Sharing',
        isArchived: false,
      },
    ],
    budgetMonths: [],
    categoryBudgets: [],
    subcategoryBudgets: [],
    failOnUpdateTxIds: new Set<string>(),
  };

  const prisma = {
    transaction: {
      findMany: jest.fn(
        (args: {
          where?: { userId?: string; id?: { in?: string[] } };
          select?: {
            id?: boolean;
            categoryId?: boolean;
            subcategoryId?: boolean;
            classificationStatus?: boolean;
            updatedAt?: boolean;
            category?: { select: { id: boolean; name: boolean } };
            subcategory?: { select: { id: boolean; name: boolean } };
          };
        }) => {
          const scopedUserId = args.where?.userId;
          const ids = args.where?.id?.in ?? [];

          const rows = state.transactions.filter((transaction) => {
            const userMatches = scopedUserId
              ? transaction.userId === scopedUserId
              : true;
            const idMatches =
              ids.length > 0 ? ids.includes(transaction.id) : true;
            return userMatches && idMatches;
          });

          const idOnlySelection =
            args.select?.id === true &&
            !args.select?.categoryId &&
            !args.select?.subcategoryId &&
            !args.select?.classificationStatus &&
            !args.select?.updatedAt;

          if (idOnlySelection) {
            return rows.map((row) => ({ id: row.id }));
          }

          return rows.map((row) => {
            const category = row.categoryId
              ? state.categories.find((item) => item.id === row.categoryId)
              : null;
            const subcategory = row.subcategoryId
              ? state.subcategories.find(
                  (item) => item.id === row.subcategoryId,
                )
              : null;

            return {
              id: row.id,
              categoryId: row.categoryId,
              subcategoryId: row.subcategoryId,
              classificationStatus: row.classificationStatus,
              updatedAt: row.updatedAt,
              category: category
                ? {
                    id: category.id,
                    name: category.name,
                  }
                : null,
              subcategory: subcategory
                ? {
                    id: subcategory.id,
                    name: subcategory.name,
                  }
                : null,
            };
          });
        },
      ),
      update: jest.fn(
        (args: {
          where: { id: string };
          data: {
            categoryId: string | null;
            subcategoryId: string | null;
            classificationStatus: 'MANUAL' | 'UNCLASSIFIED';
            confidenceScore: null;
          };
          select: { id: true };
        }) =>
          new PrismaOperation(() => {
            const transaction = state.transactions.find(
              (item) => item.id === args.where.id,
            );
            if (!transaction) {
              throw new Error('transaction not found');
            }

            if (state.failOnUpdateTxIds.has(transaction.id)) {
              throw new Error('forced transaction update failure');
            }

            transaction.categoryId = args.data.categoryId;
            transaction.subcategoryId = args.data.subcategoryId;
            transaction.classificationStatus = args.data.classificationStatus;
            transaction.updatedAt = new Date('2026-03-09T08:00:00.000Z');

            return { id: transaction.id };
          }),
      ),
    },
    budgetCategory: {
      findMany: jest.fn(
        (args: {
          where: {
            userId: string;
            isArchived: boolean;
            id: { in: string[] };
          };
          select: { id: true };
        }) =>
          state.categories
            .filter(
              (category) =>
                category.userId === args.where.userId &&
                category.isArchived === args.where.isArchived &&
                args.where.id.in.includes(category.id),
            )
            .map((category) => ({ id: category.id })),
      ),
    },
    budgetSubcategory: {
      findMany: jest.fn(
        (args: {
          where: {
            userId: string;
            isArchived: boolean;
            id: { in: string[] };
          };
          select: { id: true; categoryId: true };
        }) =>
          state.subcategories
            .filter(
              (subcategory) =>
                subcategory.userId === args.where.userId &&
                subcategory.isArchived === args.where.isArchived &&
                args.where.id.in.includes(subcategory.id),
            )
            .map((subcategory) => ({
              id: subcategory.id,
              categoryId: subcategory.categoryId,
            })),
      ),
    },
    categoryBudget: {
      upsert: jest.fn(
        (args: {
          where: {
            budgetMonthId_categoryId: {
              budgetMonthId: string;
              categoryId: string;
            };
          };
          create: {
            budgetMonthId: string;
            categoryId: string;
            plannedAmount: number;
          };
          update: {
            plannedAmount: number;
          };
        }) => {
          const key = args.where.budgetMonthId_categoryId;
          const existing = state.categoryBudgets.find(
            (item) =>
              item.budgetMonthId === key.budgetMonthId &&
              item.categoryId === key.categoryId,
          );

          if (existing) {
            existing.plannedAmount = args.update.plannedAmount;
            return existing;
          }

          const created = {
            budgetMonthId: args.create.budgetMonthId,
            categoryId: args.create.categoryId,
            plannedAmount: args.create.plannedAmount,
          };
          state.categoryBudgets.push(created);
          return created;
        },
      ),
    },
    subcategoryBudget: {
      upsert: jest.fn(
        (args: {
          where: {
            budgetMonthId_subcategoryId: {
              budgetMonthId: string;
              subcategoryId: string;
            };
          };
          create: {
            budgetMonthId: string;
            subcategoryId: string;
            plannedAmount: number;
          };
          update: {
            plannedAmount: number;
          };
        }) => {
          const key = args.where.budgetMonthId_subcategoryId;
          const existing = state.subcategoryBudgets.find(
            (item) =>
              item.budgetMonthId === key.budgetMonthId &&
              item.subcategoryId === key.subcategoryId,
          );

          if (existing) {
            existing.plannedAmount = args.update.plannedAmount;
            return existing;
          }

          const created = {
            budgetMonthId: args.create.budgetMonthId,
            subcategoryId: args.create.subcategoryId,
            plannedAmount: args.create.plannedAmount,
          };
          state.subcategoryBudgets.push(created);
          return created;
        },
      ),
    },
    budgetMonth: {
      upsert: jest.fn(
        (args: {
          where: { userId_monthYm: { userId: string; monthYm: string } };
          create: {
            userId: string;
            monthYm: string;
            plannedTotal: number;
            currency: string;
          };
          update: {
            plannedTotal: number;
            currency: string;
          };
          select: {
            id: true;
            monthYm: true;
            plannedTotal: true;
          };
        }) => {
          const key = args.where.userId_monthYm;
          const existing = state.budgetMonths.find(
            (item) =>
              item.userId === key.userId && item.monthYm === key.monthYm,
          );

          if (existing) {
            existing.plannedTotal = args.update.plannedTotal;
            existing.currency = args.update.currency;
            return {
              id: existing.id,
              monthYm: existing.monthYm,
              plannedTotal: existing.plannedTotal,
            };
          }

          const created = {
            id: `bm-${state.budgetMonths.length + 1}`,
            userId: args.create.userId,
            monthYm: args.create.monthYm,
            plannedTotal: args.create.plannedTotal,
            currency: args.create.currency,
          };
          state.budgetMonths.push(created);
          return {
            id: created.id,
            monthYm: created.monthYm,
            plannedTotal: created.plannedTotal,
          };
        },
      ),
    },
    user: {
      findUnique: jest.fn((args: { where: { id: string } }) => {
        const user =
          state.users.find((item) => item.id === args.where.id) ?? null;
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          timeZone: user.timeZone,
          baseCurrency: user.baseCurrency,
        };
      }),
    },
    $transaction: jest.fn(async (operationsOrCallback: unknown) => {
      if (typeof operationsOrCallback === 'function') {
        const txClient = {
          ...prisma,
          $transaction: prisma.$transaction,
        };
        return (
          operationsOrCallback as (tx: typeof txClient) => Promise<unknown>
        )(txClient);
      }

      const operations = operationsOrCallback as unknown[];
      const snapshot = state.transactions.map((transaction) => ({
        ...transaction,
      }));
      const categoryBudgetSnapshot = state.categoryBudgets.map((item) => ({
        ...item,
      }));
      const subcategoryBudgetSnapshot = state.subcategoryBudgets.map(
        (item) => ({
          ...item,
        }),
      );
      const budgetMonthSnapshot = state.budgetMonths.map((item) => ({
        ...item,
      }));

      try {
        const results: unknown[] = [];

        for (const operation of operations) {
          if (
            operation &&
            typeof operation === 'object' &&
            'run' in operation
          ) {
            results.push(
              await (operation as { run: () => Promise<unknown> }).run(),
            );
            continue;
          }

          results.push(await Promise.resolve(operation));
        }

        return results;
      } catch (error) {
        state.transactions = snapshot;
        state.categoryBudgets = categoryBudgetSnapshot;
        state.subcategoryBudgets = subcategoryBudgetSnapshot;
        state.budgetMonths = budgetMonthSnapshot;
        throw error;
      }
    }),
  };

  const service = new CategoryManagementService(prisma as never);

  return {
    service,
    state,
    prisma,
  };
};

describe('CategoryManagementService.assignTransactions', () => {
  it('applies valid atomic assignments and returns updated rows', async () => {
    const { service, state } = createFixture();

    const result = await service.assignTransactions('user-1', {
      items: [
        {
          transactionId: 'tx-1',
          categoryId: 'cat-food',
          subcategoryId: 'sub-groceries',
        },
      ],
      options: {
        atomic: true,
        requireSubcategory: true,
      },
    });

    expect(result.updatedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.updated[0]).toMatchObject({
      transactionId: 'tx-1',
      categoryId: 'cat-food',
      subcategoryId: 'sub-groceries',
      classificationStatus: 'MANUAL',
    });

    const updatedTx = state.transactions.find(
      (transaction) => transaction.id === 'tx-1',
    );
    expect(updatedTx?.categoryId).toBe('cat-food');
    expect(updatedTx?.subcategoryId).toBe('sub-groceries');
    expect(updatedTx?.classificationStatus).toBe('MANUAL');
  });

  it('rolls back all updates in atomic mode if one update fails', async () => {
    const { service, state } = createFixture();
    state.failOnUpdateTxIds.add('tx-2');

    await expect(
      service.assignTransactions('user-1', {
        items: [
          {
            transactionId: 'tx-1',
            categoryId: 'cat-food',
            subcategoryId: 'sub-groceries',
          },
          {
            transactionId: 'tx-2',
            categoryId: 'cat-transport',
            subcategoryId: 'sub-uber',
          },
        ],
        options: {
          atomic: true,
          requireSubcategory: true,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const tx1 = state.transactions.find(
      (transaction) => transaction.id === 'tx-1',
    );
    const tx2 = state.transactions.find(
      (transaction) => transaction.id === 'tx-2',
    );

    expect(tx1).toMatchObject({
      categoryId: null,
      subcategoryId: null,
      classificationStatus: 'UNCLASSIFIED',
    });
    expect(tx2).toMatchObject({
      categoryId: null,
      subcategoryId: null,
      classificationStatus: 'UNCLASSIFIED',
    });
  });

  it('throws 400 when subcategory does not belong to the selected category', async () => {
    const { service } = createFixture();

    await expect(
      service.assignTransactions('user-1', {
        items: [
          {
            transactionId: 'tx-1',
            categoryId: 'cat-food',
            subcategoryId: 'sub-uber',
          },
        ],
        options: {
          atomic: true,
          requireSubcategory: true,
        },
      }),
    ).rejects.toThrow('subcategoryId does not belong to categoryId');
  });

  it('throws when trying to assign a transaction that does not belong to the user', async () => {
    const { service } = createFixture();

    await expect(
      service.assignTransactions('user-1', {
        items: [
          {
            transactionId: 'tx-other-user',
            categoryId: 'cat-food',
            subcategoryId: 'sub-groceries',
          },
        ],
        options: {
          atomic: true,
          requireSubcategory: true,
        },
      }),
    ).rejects.toThrow('Transaction not found for this user');
  });

  it('persists category and subcategory budgets through assign endpoint', async () => {
    const { service, state } = createFixture();

    const result = await service.assignTransactions('user-1', {
      items: [],
      budgetPlan: {
        monthYm: '2026-03',
        monthlyTarget: 500,
        categoryBudgets: [
          { categoryId: 'cat-food', plannedAmount: 320 },
          { categoryId: 'cat-transport', plannedAmount: 180 },
        ],
        subcategoryBudgets: [
          { subcategoryId: 'sub-groceries', plannedAmount: 300 },
          { subcategoryId: 'sub-uber', plannedAmount: 200 },
        ],
      },
      options: {
        atomic: true,
        requireSubcategory: true,
      },
    });

    expect(result.updatedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.budgetPlan).toMatchObject({
      monthYm: '2026-03',
      plannedTotal: 500,
      categoryBudgetsUpserted: 2,
      subcategoryBudgetsUpserted: 2,
    });

    expect(state.budgetMonths).toHaveLength(1);
    expect(state.categoryBudgets).toHaveLength(2);
    expect(state.subcategoryBudgets).toHaveLength(2);
  });

  it('uses category budget total as month planned total when monthlyTarget is omitted', async () => {
    const { service, state } = createFixture();

    const result = await service.assignTransactions('user-1', {
      items: [],
      budgetPlan: {
        monthYm: '2026-03',
        categoryBudgets: [
          { categoryId: 'cat-food', plannedAmount: 120.5 },
          { categoryId: 'cat-transport', plannedAmount: 80.25 },
        ],
        subcategoryBudgets: [],
      },
      options: {
        atomic: true,
        requireSubcategory: true,
      },
    });

    expect(result.budgetPlan?.plannedTotal).toBe(200.75);
    expect(state.budgetMonths[0]?.plannedTotal).toBe(200.75);
  });

  it('throws 400 for invalid subcategory id in budgetPlan', async () => {
    const { service } = createFixture();

    await expect(
      service.assignTransactions('user-1', {
        items: [],
        budgetPlan: {
          monthYm: '2026-03',
          categoryBudgets: [],
          subcategoryBudgets: [
            {
              subcategoryId: 'sub-missing',
              plannedAmount: 45,
            },
          ],
        },
        options: {
          atomic: true,
          requireSubcategory: true,
        },
      }),
    ).rejects.toThrow('Invalid subcategoryId in budgetPlan');
  });
});
