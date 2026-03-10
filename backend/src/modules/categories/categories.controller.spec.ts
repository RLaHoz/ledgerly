jest.mock(
  './services/category-management.service',
  () => ({
    CategoryManagementService: class CategoryManagementService {},
  }),
  { virtual: true },
);

jest.mock(
  './services/category-transaction-import.service',
  () => ({
    CategoryTransactionImportService: class CategoryTransactionImportService {},
  }),
  { virtual: true },
);

import { CategoriesController } from './categories.controller';

describe('CategoriesController', () => {
  it('routes legacy bulk classification endpoint through the new assign handler', async () => {
    const categoryManagementService = {
      assignTransactions: jest.fn().mockResolvedValue({
        updatedCount: 1,
        failedCount: 0,
        updated: [],
        failed: [],
      }),
    };

    const controller = new CategoriesController(
      categoryManagementService as never,
      {} as never,
    );

    const dto = {
      items: [
        {
          transactionId: '5f4f2724-f52c-4804-99a5-c0266da0cebe',
          categoryId: 'ec51ba83-61cf-4db2-924f-fcd0d9d9cb43',
          subcategoryId: 'b7d0d92a-86af-48cb-8f2a-cd3fa4c4f4e1',
        },
      ],
    };

    await controller.bulkUpdateTransactionClassification('user-1', dto);

    expect(categoryManagementService.assignTransactions).toHaveBeenCalledWith(
      'user-1',
      {
        items: dto.items,
        options: {
          atomic: false,
          requireSubcategory: false,
        },
      },
    );
  });
});
