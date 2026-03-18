import { TransactionsGroupingService } from './transactions-grouping.service';

describe('TransactionsGroupingService', () => {
  const service = new TransactionsGroupingService();

  it('groups by category/subcategory and creates uncategorized bucket', () => {
    const response = service.buildGroupedResponse({
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-07T00:00:00.000Z'),
      userTimeZone: 'UTC',
      sync: {
        performed: true,
        reason: 'forced',
        syncRunIds: ['run_1'],
        syncedAt: '2026-03-07T00:00:00.000Z',
      },
      categoryById: new Map([['cat_1', { name: 'Groceries', sortOrder: 1 }]]),
      subcategoryById: new Map([
        ['sub_1', { name: 'Supermarket', sortOrder: 1 }],
      ]),
      transactions: [
        {
          id: 'tx_1',
          occurredAt: new Date('2026-03-03T10:00:00.000Z'),
          bookingDate: null,
          amountSigned: -25,
          currency: 'AUD',
          merchant: 'Woolworths',
          description: 'Groceries',
          isPending: false,
          classificationStatus: 'AUTO',
          categoryId: 'cat_1',
          subcategoryId: 'sub_1',
          classifiedByRuleId: 'rule_1',
        },
        {
          id: 'tx_2',
          occurredAt: new Date('2026-03-04T10:00:00.000Z'),
          bookingDate: null,
          amountSigned: -10,
          currency: 'AUD',
          merchant: null,
          description: 'Unknown merchant',
          isPending: false,
          classificationStatus: 'UNCLASSIFIED',
          categoryId: null,
          subcategoryId: null,
          classifiedByRuleId: null,
        },
      ],
    });

    expect(response.totals.txCount).toBe(2);
    expect(response.categories).toHaveLength(2);
    expect(
      response.categories.some((item) => item.name === 'Uncategorized'),
    ).toBe(true);
  });
});
