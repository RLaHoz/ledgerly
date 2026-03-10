import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../sourceDB/database/prisma.service';
import {
  AssignTransactionsBudgetPlanDto,
  AssignTransactionsDto,
} from '../dto/assign-transactions.dto';
import { BulkUpdateTransactionClassificationDto } from '../dto/bulk-update-transaction-classification.dto';
import { CreateUserCategoryDto } from '../dto/create-user-category.dto';
import { CreateUserSubcategoryDto } from '../dto/create-user-subcategory.dto';
import { ListUserCategoriesQueryDto } from '../dto/list-user-categories-query.dto';
import { ReorderUserCategoriesDto } from '../dto/reorder-user-categories.dto';
import { ReorderUserSubcategoriesDto } from '../dto/reorder-user-subcategories.dto';
import { UpdateTransactionClassificationDto } from '../dto/update-transaction-classification.dto';
import { UpdateUserCategoryDto } from '../dto/update-user-category.dto';
import { UpdateUserSubcategoryDto } from '../dto/update-user-subcategory.dto';

const DEFAULT_CATEGORY_ICON = 'pricetag-outline';
const DEFAULT_SUBCATEGORY_ICON = 'ellipse-outline';
const DEFAULT_COLOR_HEX = '#64748B';
const BULK_UPDATE_CHUNK_SIZE = 50;

export interface AppCategoryView {
  id: string;
  slug: string;
  name: string;
  ionIcon: string;
  colorHex: string;
  sortOrder: number;
  subcategories: Array<{
    id: string;
    slug: string;
    name: string;
    ionIcon: string;
    colorHex: string;
    sortOrder: number;
  }>;
}

export interface UserCategoryView {
  id: string;
  appCategoryId: string | null;
  name: string;
  slug: string;
  ionIcon: string;
  colorHex: string;
  sortOrder: number;
  isArchived: boolean;
  txCount: number;
  spent: number;
  subcategories: Array<{
    id: string;
    appSubcategoryId: string | null;
    categoryId: string;
    name: string;
    slug: string;
    ionIcon: string;
    colorHex: string;
    sortOrder: number;
    isArchived: boolean;
    txCount: number;
    spent: number;
  }>;
}

export interface TransactionClassificationView {
  transactionId: string;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  classificationStatus: 'AUTO' | 'MANUAL' | 'UNCLASSIFIED';
  updatedAt: string;
}

type ClassificationUpdateData = {
  categoryId: string | null;
  subcategoryId: string | null;
  classificationStatus: 'MANUAL' | 'UNCLASSIFIED';
  confidenceScore: null;
};

type ClassificationAssignmentItem = {
  transactionId: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
};

type AssignmentExecutionOptions = {
  atomic: boolean;
  requireSubcategory: boolean;
};

type ClassificationBulkResult = {
  updatedCount: number;
  failedCount: number;
  updated: TransactionClassificationView[];
  failed: Array<{ transactionId: string; message: string }>;
};

type BudgetPlanPersistResult = {
  monthYm: string;
  plannedTotal: number;
  categoryBudgetsUpserted: number;
  subcategoryBudgetsUpserted: number;
};

type AssignTransactionsResult = ClassificationBulkResult & {
  budgetPlan?: BudgetPlanPersistResult;
};

@Injectable()
export class CategoryManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async listAppCategories(): Promise<AppCategoryView[]> {
    const appCategories = await this.prisma.appCategoryList.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        appSubcategories: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            slug: true,
            name: true,
            ionIcon: true,
            colorHex: true,
            sortOrder: true,
          },
        },
      },
    });

    return appCategories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      ionIcon: category.ionIcon,
      colorHex: category.colorHex,
      sortOrder: category.sortOrder,
      subcategories: category.appSubcategories.map((subcategory) => ({
        id: subcategory.id,
        slug: subcategory.slug,
        name: subcategory.name,
        ionIcon: subcategory.ionIcon,
        colorHex: subcategory.colorHex,
        sortOrder: subcategory.sortOrder,
      })),
    }));
  }

  async bootstrapUserCategoriesFromApp(userId: string): Promise<{
    createdCategories: number;
    createdSubcategories: number;
  }> {
    await this.assertUserExists(userId);

    const appCategories = await this.prisma.appCategoryList.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        appSubcategories: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            appCategoryId: true,
            slug: true,
            name: true,
            ionIcon: true,
            colorHex: true,
            sortOrder: true,
          },
        },
      },
    });

    const [userCategories, userSubcategories] = await Promise.all([
      this.prisma.budgetCategory.findMany({
        where: { userId },
        select: {
          id: true,
          appCategoryId: true,
          slug: true,
          sortOrder: true,
        },
      }),
      this.prisma.budgetSubcategory.findMany({
        where: { userId },
        select: {
          id: true,
          categoryId: true,
          appSubcategoryId: true,
          slug: true,
          sortOrder: true,
        },
      }),
    ]);

    const userCategoryByAppCategoryId = new Map(
      userCategories
        .filter((category) => category.appCategoryId !== null)
        .map((category) => [category.appCategoryId as string, category]),
    );

    const userSubcategoryByAppSubcategoryId = new Map(
      userSubcategories
        .filter((subcategory) => subcategory.appSubcategoryId !== null)
        .map((subcategory) => [subcategory.appSubcategoryId as string, subcategory]),
    );

    const usedCategorySlugs = new Set(userCategories.map((category) => category.slug));
    const usedSubcategorySlugsByCategoryId = new Map<string, Set<string>>();

    for (const subcategory of userSubcategories) {
      const usedSlugsForCategory =
        usedSubcategorySlugsByCategoryId.get(subcategory.categoryId) ??
        new Set<string>();
      usedSlugsForCategory.add(subcategory.slug);
      usedSubcategorySlugsByCategoryId.set(
        subcategory.categoryId,
        usedSlugsForCategory,
      );
    }

    let nextCategorySortOrder =
      userCategories.reduce(
        (highestSortOrder, category) =>
          Math.max(highestSortOrder, category.sortOrder),
        -1,
      ) + 1;

    const nextSubcategorySortOrderByCategoryId = new Map<string, number>();
    for (const subcategory of userSubcategories) {
      const currentNext =
        nextSubcategorySortOrderByCategoryId.get(subcategory.categoryId) ?? 0;
      nextSubcategorySortOrderByCategoryId.set(
        subcategory.categoryId,
        Math.max(currentNext, subcategory.sortOrder + 1),
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let createdCategories = 0;
      let createdSubcategories = 0;

      for (const appCategory of appCategories) {
        let userCategory = userCategoryByAppCategoryId.get(appCategory.id);

        if (!userCategory) {
          const baseSlug = this.slugify(appCategory.slug || appCategory.name, 'category');
          const uniqueCategorySlug = this.buildUniqueSlugFromSet(
            usedCategorySlugs,
            baseSlug,
            120,
          );
          usedCategorySlugs.add(uniqueCategorySlug);

          const createdCategory = await tx.budgetCategory.create({
            data: {
              userId,
              appCategoryId: appCategory.id,
              name: appCategory.name,
              slug: uniqueCategorySlug,
              ionIcon: appCategory.ionIcon,
              colorHex: this.normalizeColorHex(appCategory.colorHex),
              sortOrder: nextCategorySortOrder,
              isArchived: false,
            },
            select: {
              id: true,
              appCategoryId: true,
              slug: true,
              sortOrder: true,
            },
          });

          nextCategorySortOrder += 1;
          createdCategories += 1;
          userCategory = createdCategory;
          userCategoryByAppCategoryId.set(appCategory.id, createdCategory);
        }

        const categoryId = userCategory.id;
        let nextSubcategorySortOrder =
          nextSubcategorySortOrderByCategoryId.get(categoryId) ?? 0;

        for (const appSubcategory of appCategory.appSubcategories) {
          if (userSubcategoryByAppSubcategoryId.has(appSubcategory.id)) {
            continue;
          }

          const usedSubcategorySlugs =
            usedSubcategorySlugsByCategoryId.get(categoryId) ?? new Set<string>();

          const baseSubcategorySlug = this.slugify(
            appSubcategory.slug || appSubcategory.name,
            'subcategory',
          );

          const uniqueSubcategorySlug = this.buildUniqueSlugFromSet(
            usedSubcategorySlugs,
            baseSubcategorySlug,
            120,
          );

          usedSubcategorySlugs.add(uniqueSubcategorySlug);
          usedSubcategorySlugsByCategoryId.set(categoryId, usedSubcategorySlugs);

          const createdSubcategory = await tx.budgetSubcategory.create({
            data: {
              userId,
              categoryId,
              appSubcategoryId: appSubcategory.id,
              name: appSubcategory.name,
              slug: uniqueSubcategorySlug,
              ionIcon: appSubcategory.ionIcon,
              colorHex: this.normalizeColorHex(appSubcategory.colorHex),
              sortOrder: nextSubcategorySortOrder,
              isArchived: false,
            },
            select: {
              id: true,
              categoryId: true,
              appSubcategoryId: true,
              slug: true,
              sortOrder: true,
            },
          });

          nextSubcategorySortOrder += 1;
          createdSubcategories += 1;
          userSubcategoryByAppSubcategoryId.set(
            appSubcategory.id,
            createdSubcategory,
          );
        }

        nextSubcategorySortOrderByCategoryId.set(
          categoryId,
          nextSubcategorySortOrder,
        );
      }

      return { createdCategories, createdSubcategories };
    });
  }

  async listUserCategories(
    userId: string,
    query: ListUserCategoriesQueryDto,
  ): Promise<{
    from: string;
    to: string;
    categories: UserCategoryView[];
  }> {
    await this.assertUserExists(userId);

    const range = this.resolveDateRange(query.from, query.to);

    const categoryFilter = query.includeArchived
      ? { userId }
      : { userId, isArchived: false };

    const subcategoryFilter = query.includeArchived
      ? { userId }
      : { userId, isArchived: false };

    const userCategories = await this.prisma.budgetCategory.findMany({
      where: categoryFilter,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        subcategories: {
          where: subcategoryFilter,
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            appSubcategoryId: true,
            categoryId: true,
            name: true,
            slug: true,
            ionIcon: true,
            colorHex: true,
            sortOrder: true,
            isArchived: true,
          },
        },
      },
    });

    const transactionRangeFilter = {
      userId,
      occurredAt: {
        gte: range.from,
        lte: range.to,
      },
    };

    const [
      categoryCountRows,
      categorySpendRows,
      subcategoryCountRows,
      subcategorySpendRows,
    ] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          ...transactionRangeFilter,
          categoryId: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          ...transactionRangeFilter,
          categoryId: { not: null },
          amountSigned: { lt: 0 },
        },
        _sum: { amountSigned: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['subcategoryId'],
        where: {
          ...transactionRangeFilter,
          subcategoryId: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['subcategoryId'],
        where: {
          ...transactionRangeFilter,
          subcategoryId: { not: null },
          amountSigned: { lt: 0 },
        },
        _sum: { amountSigned: true },
      }),
    ]);

    const categoryTxCountById = new Map<string, number>();
    for (const row of categoryCountRows) {
      if (row.categoryId) {
        categoryTxCountById.set(row.categoryId, row._count._all);
      }
    }

    const categorySpentById = new Map<string, number>();
    for (const row of categorySpendRows) {
      if (row.categoryId) {
        const signedAmount = this.decimalToNumber(row._sum.amountSigned);
        categorySpentById.set(row.categoryId, Math.abs(signedAmount));
      }
    }

    const subcategoryTxCountById = new Map<string, number>();
    for (const row of subcategoryCountRows) {
      if (row.subcategoryId) {
        subcategoryTxCountById.set(row.subcategoryId, row._count._all);
      }
    }

    const subcategorySpentById = new Map<string, number>();
    for (const row of subcategorySpendRows) {
      if (row.subcategoryId) {
        const signedAmount = this.decimalToNumber(row._sum.amountSigned);
        subcategorySpentById.set(row.subcategoryId, Math.abs(signedAmount));
      }
    }

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      categories: userCategories.map((category) => ({
        id: category.id,
        appCategoryId: category.appCategoryId,
        name: category.name,
        slug: category.slug,
        ionIcon: category.ionIcon,
        colorHex: category.colorHex,
        sortOrder: category.sortOrder,
        isArchived: category.isArchived,
        txCount: categoryTxCountById.get(category.id) ?? 0,
        spent: categorySpentById.get(category.id) ?? 0,
        subcategories: category.subcategories.map((subcategory) => ({
          id: subcategory.id,
          appSubcategoryId: subcategory.appSubcategoryId,
          categoryId: subcategory.categoryId,
          name: subcategory.name,
          slug: subcategory.slug,
          ionIcon: subcategory.ionIcon,
          colorHex: subcategory.colorHex,
          sortOrder: subcategory.sortOrder,
          isArchived: subcategory.isArchived,
          txCount: subcategoryTxCountById.get(subcategory.id) ?? 0,
          spent: subcategorySpentById.get(subcategory.id) ?? 0,
        })),
      })),
    };
  }

  async createUserCategory(
    userId: string,
    dto: CreateUserCategoryDto,
  ): Promise<UserCategoryView> {
    await this.assertUserExists(userId);

    if (dto.appCategoryId) {
      const appCategory = await this.prisma.appCategoryList.findFirst({
        where: { id: dto.appCategoryId, isActive: true },
        select: { id: true },
      });

      if (!appCategory) {
        throw new BadRequestException('Invalid appCategoryId');
      }

      const existingMappedCategory = await this.prisma.budgetCategory.findFirst({
        where: { userId, appCategoryId: dto.appCategoryId },
        select: { id: true },
      });

      if (existingMappedCategory) {
        throw new BadRequestException(
          'This app category is already mapped for the user',
        );
      }
    }

    const baseSlug = this.slugify(dto.slug ?? dto.name, 'category');
    const uniqueCategorySlug = await this.resolveUniqueCategorySlugInMemory(
      userId,
      baseSlug,
    );

    const lastUserCategory = await this.prisma.budgetCategory.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const createdCategory = await this.prisma.budgetCategory.create({
      data: {
        userId,
        appCategoryId: dto.appCategoryId ?? null,
        name: dto.name.trim(),
        slug: uniqueCategorySlug,
        ionIcon: dto.ionIcon?.trim() || DEFAULT_CATEGORY_ICON,
        colorHex: this.normalizeColorHex(dto.colorHex),
        sortOrder: (lastUserCategory?.sortOrder ?? -1) + 1,
        isArchived: false,
      },
      select: {
        id: true,
        appCategoryId: true,
        name: true,
        slug: true,
        ionIcon: true,
        colorHex: true,
        sortOrder: true,
        isArchived: true,
      },
    });

    return {
      ...createdCategory,
      txCount: 0,
      spent: 0,
      subcategories: [],
    };
  }

  async updateUserCategory(
    userId: string,
    categoryId: string,
    dto: UpdateUserCategoryDto,
  ): Promise<UserCategoryView> {
    const existingCategory = await this.prisma.budgetCategory.findFirst({
      where: { id: categoryId, userId },
      select: {
        id: true,
        appCategoryId: true,
        name: true,
        slug: true,
        ionIcon: true,
        colorHex: true,
        sortOrder: true,
        isArchived: true,
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('User category not found');
    }

    const nextName = dto.name?.trim() ?? existingCategory.name;
    const shouldRecomputeSlug = Boolean(dto.slug || dto.name);

    const nextSlug = shouldRecomputeSlug
      ? await this.resolveUniqueCategorySlugInMemory(
          userId,
          this.slugify(dto.slug ?? nextName, 'category'),
          categoryId,
        )
      : existingCategory.slug;

    const updatedCategory = await this.prisma.budgetCategory.update({
      where: { id: categoryId },
      data: {
        name: nextName,
        slug: nextSlug,
        ionIcon: dto.ionIcon?.trim() ?? existingCategory.ionIcon,
        colorHex: dto.colorHex
          ? this.normalizeColorHex(dto.colorHex)
          : existingCategory.colorHex,
      },
      select: {
        id: true,
        appCategoryId: true,
        name: true,
        slug: true,
        ionIcon: true,
        colorHex: true,
        sortOrder: true,
        isArchived: true,
      },
    });

    return {
      ...updatedCategory,
      txCount: 0,
      spent: 0,
      subcategories: [],
    };
  }

  async archiveUserCategory(
    userId: string,
    categoryId: string,
  ): Promise<{ success: true }> {
    const categoryUpdate = await this.prisma.budgetCategory.updateMany({
      where: { id: categoryId, userId },
      data: { isArchived: true },
    });

    if (categoryUpdate.count === 0) {
      throw new NotFoundException('User category not found');
    }

    await this.prisma.budgetSubcategory.updateMany({
      where: { userId, categoryId },
      data: { isArchived: true },
    });

    return { success: true };
  }

  async restoreUserCategory(
    userId: string,
    categoryId: string,
  ): Promise<{ success: true }> {
    const categoryUpdate = await this.prisma.budgetCategory.updateMany({
      where: { id: categoryId, userId },
      data: { isArchived: false },
    });

    if (categoryUpdate.count === 0) {
      throw new NotFoundException('User category not found');
    }

    await this.prisma.budgetSubcategory.updateMany({
      where: { userId, categoryId },
      data: { isArchived: false },
    });

    return { success: true };
  }

  async reorderUserCategories(
    userId: string,
    dto: ReorderUserCategoriesDto,
  ): Promise<{ success: true }> {
    const existingCategories = await this.prisma.budgetCategory.findMany({
      where: { userId, isArchived: false },
      select: { id: true },
    });

    if (existingCategories.length !== dto.orderedCategoryIds.length) {
      throw new BadRequestException(
        'orderedCategoryIds must include all non-archived user categories',
      );
    }

    const existingCategoryIdSet = new Set(existingCategories.map((c) => c.id));
    for (const categoryId of dto.orderedCategoryIds) {
      if (!existingCategoryIdSet.has(categoryId)) {
        throw new BadRequestException('Invalid category id in reorder payload');
      }
    }

    await this.prisma.$transaction(
      dto.orderedCategoryIds.map((categoryId, sortOrder) =>
        this.prisma.budgetCategory.update({
          where: { id: categoryId },
          data: { sortOrder },
        }),
      ),
    );

    return { success: true };
  }

  async createUserSubcategory(
    userId: string,
    categoryId: string,
    dto: CreateUserSubcategoryDto,
  ): Promise<UserCategoryView['subcategories'][number]> {
    const parentCategory = await this.ensureCategoryOwnership(userId, categoryId);

    if (parentCategory.isArchived) {
      throw new BadRequestException(
        'Cannot create subcategory under an archived category',
      );
    }

    if (dto.appSubcategoryId) {
      const appSubcategory = await this.prisma.appSubcategoryList.findFirst({
        where: { id: dto.appSubcategoryId, isActive: true },
        select: { id: true, appCategoryId: true },
      });

      if (!appSubcategory) {
        throw new BadRequestException('Invalid appSubcategoryId');
      }

      if (
        parentCategory.appCategoryId &&
        appSubcategory.appCategoryId !== parentCategory.appCategoryId
      ) {
        throw new BadRequestException(
          'appSubcategoryId does not belong to the category app template',
        );
      }

      const existingMappedSubcategory =
        await this.prisma.budgetSubcategory.findFirst({
          where: { userId, appSubcategoryId: dto.appSubcategoryId },
          select: { id: true },
        });

      if (existingMappedSubcategory) {
        throw new BadRequestException(
          'This app subcategory is already mapped for the user',
        );
      }
    }

    const baseSlug = this.slugify(dto.slug ?? dto.name, 'subcategory');
    const uniqueSubcategorySlug = await this.resolveUniqueSubcategorySlugInMemory(
      userId,
      categoryId,
      baseSlug,
    );

    const lastUserSubcategory = await this.prisma.budgetSubcategory.findFirst({
      where: { userId, categoryId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const createdSubcategory = await this.prisma.budgetSubcategory.create({
      data: {
        userId,
        categoryId,
        appSubcategoryId: dto.appSubcategoryId ?? null,
        name: dto.name.trim(),
        slug: uniqueSubcategorySlug,
        ionIcon: dto.ionIcon?.trim() || DEFAULT_SUBCATEGORY_ICON,
        colorHex: this.normalizeColorHex(dto.colorHex),
        sortOrder: (lastUserSubcategory?.sortOrder ?? -1) + 1,
        isArchived: false,
      },
      select: {
        id: true,
        appSubcategoryId: true,
        categoryId: true,
        name: true,
        slug: true,
        ionIcon: true,
        colorHex: true,
        sortOrder: true,
        isArchived: true,
      },
    });

    return {
      ...createdSubcategory,
      txCount: 0,
      spent: 0,
    };
  }

  async updateUserSubcategory(
    userId: string,
    subcategoryId: string,
    dto: UpdateUserSubcategoryDto,
  ): Promise<UserCategoryView['subcategories'][number]> {
    const existingSubcategory = await this.prisma.budgetSubcategory.findFirst({
      where: { id: subcategoryId, userId },
      select: {
        id: true,
        appSubcategoryId: true,
        categoryId: true,
        name: true,
        slug: true,
        ionIcon: true,
        colorHex: true,
        sortOrder: true,
        isArchived: true,
      },
    });

    if (!existingSubcategory) {
      throw new NotFoundException('User subcategory not found');
    }

    const targetCategoryId = dto.categoryId ?? existingSubcategory.categoryId;
    const targetCategory = await this.ensureCategoryOwnership(
      userId,
      targetCategoryId,
    );

    if (targetCategory.isArchived) {
      throw new BadRequestException(
        'Cannot move/update subcategory into an archived category',
      );
    }

    const nextName = dto.name?.trim() ?? existingSubcategory.name;

    const shouldRecomputeSlug =
      Boolean(dto.slug || dto.name) || targetCategoryId !== existingSubcategory.categoryId;

    const nextSlug = shouldRecomputeSlug
      ? await this.resolveUniqueSubcategorySlugInMemory(
          userId,
          targetCategoryId,
          this.slugify(dto.slug ?? nextName, 'subcategory'),
          subcategoryId,
        )
      : existingSubcategory.slug;

    const updatedSubcategory = await this.prisma.budgetSubcategory.update({
      where: { id: subcategoryId },
      data: {
        categoryId: targetCategoryId,
        name: nextName,
        slug: nextSlug,
        ionIcon: dto.ionIcon?.trim() ?? existingSubcategory.ionIcon,
        colorHex: dto.colorHex
          ? this.normalizeColorHex(dto.colorHex)
          : existingSubcategory.colorHex,
      },
      select: {
        id: true,
        appSubcategoryId: true,
        categoryId: true,
        name: true,
        slug: true,
        ionIcon: true,
        colorHex: true,
        sortOrder: true,
        isArchived: true,
      },
    });

    return {
      ...updatedSubcategory,
      txCount: 0,
      spent: 0,
    };
  }

  async archiveUserSubcategory(
    userId: string,
    subcategoryId: string,
  ): Promise<{ success: true }> {
    const subcategoryUpdate = await this.prisma.budgetSubcategory.updateMany({
      where: { id: subcategoryId, userId },
      data: { isArchived: true },
    });

    if (subcategoryUpdate.count === 0) {
      throw new NotFoundException('User subcategory not found');
    }

    return { success: true };
  }

  async restoreUserSubcategory(
    userId: string,
    subcategoryId: string,
  ): Promise<{ success: true }> {
    const subcategoryUpdate = await this.prisma.budgetSubcategory.updateMany({
      where: { id: subcategoryId, userId },
      data: { isArchived: false },
    });

    if (subcategoryUpdate.count === 0) {
      throw new NotFoundException('User subcategory not found');
    }

    return { success: true };
  }

  async reorderUserSubcategories(
    userId: string,
    categoryId: string,
    dto: ReorderUserSubcategoriesDto,
  ): Promise<{ success: true }> {
    await this.ensureCategoryOwnership(userId, categoryId);

    const existingSubcategories = await this.prisma.budgetSubcategory.findMany({
      where: { userId, categoryId, isArchived: false },
      select: { id: true },
    });

    if (existingSubcategories.length !== dto.orderedSubcategoryIds.length) {
      throw new BadRequestException(
        'orderedSubcategoryIds must include all non-archived subcategories',
      );
    }

    const existingSubcategoryIdSet = new Set(
      existingSubcategories.map((subcategory) => subcategory.id),
    );

    for (const subcategoryId of dto.orderedSubcategoryIds) {
      if (!existingSubcategoryIdSet.has(subcategoryId)) {
        throw new BadRequestException(
          'Invalid subcategory id in reorder payload',
        );
      }
    }

    await this.prisma.$transaction(
      dto.orderedSubcategoryIds.map((subcategoryId, sortOrder) =>
        this.prisma.budgetSubcategory.update({
          where: { id: subcategoryId },
          data: { sortOrder },
        }),
      ),
    );

    return { success: true };
  }

  async updateTransactionClassification(
    userId: string,
    transactionId: string,
    patch: UpdateTransactionClassificationDto,
  ): Promise<TransactionClassificationView> {
    const result = await this.executeTransactionClassificationAssignment(userId, [
      {
        transactionId,
        categoryId: patch.categoryId,
        subcategoryId: patch.subcategoryId,
      },
    ], {
      atomic: false,
      requireSubcategory: false,
    });

    if (result.failedCount > 0) {
      const errorMessage =
        result.failed[0]?.message ?? 'Invalid classification update';
      if (errorMessage === 'Transaction not found for this user') {
        throw new NotFoundException(errorMessage);
      }
      throw new BadRequestException(errorMessage);
    }

    return result.updated[0];
  }

  async assignTransactions(
    userId: string,
    dto: AssignTransactionsDto,
  ): Promise<AssignTransactionsResult> {
    const classificationItems = dto.items ?? [];
    const hasBudgetPlan = Boolean(dto.budgetPlan);
    if (!classificationItems.length && !hasBudgetPlan) {
      throw new BadRequestException(
        'At least one classification item or budgetPlan is required',
      );
    }

    const options: AssignmentExecutionOptions = {
      atomic: dto.options?.atomic ?? true,
      requireSubcategory: dto.options?.requireSubcategory ?? true,
    };

    const assignmentResult = classificationItems.length
      ? await this.executeTransactionClassificationAssignment(
          userId,
          classificationItems,
          options,
        )
      : {
          updatedCount: 0,
          failedCount: 0,
          updated: [],
          failed: [],
        };

    if (!dto.budgetPlan) {
      return assignmentResult;
    }

    const persistedBudgetPlan = await this.persistBudgetPlan(
      userId,
      dto.budgetPlan,
    );

    return {
      ...assignmentResult,
      budgetPlan: persistedBudgetPlan,
    };
  }

  async bulkUpdateTransactionClassification(
    userId: string,
    dto: BulkUpdateTransactionClassificationDto,
  ): Promise<ClassificationBulkResult> {
    return this.executeTransactionClassificationAssignment(
      userId,
      dto.items,
      {
        atomic: false,
        requireSubcategory: false,
      },
    );
  }

  private async executeTransactionClassificationAssignment(
    userId: string,
    items: readonly ClassificationAssignmentItem[],
    options: AssignmentExecutionOptions,
  ): Promise<ClassificationBulkResult> {
    const dedupedItems = [
      ...new Map(items.map((item) => [item.transactionId, item])).values(),
    ];

    const transactionIds = dedupedItems.map((item) => item.transactionId);
    const categoryIds = [
      ...new Set(
        dedupedItems
          .map((item) => item.categoryId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const subcategoryIds = [
      ...new Set(
        dedupedItems
          .map((item) => item.subcategoryId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const existingTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        id: { in: transactionIds },
      },
      select: { id: true },
    });

    const userCategories =
      categoryIds.length > 0
        ? await this.prisma.budgetCategory.findMany({
            where: {
              userId,
              isArchived: false,
              id: { in: categoryIds },
            },
            select: { id: true },
          })
        : [];

    const userSubcategories =
      subcategoryIds.length > 0
        ? await this.prisma.budgetSubcategory.findMany({
            where: {
              userId,
              isArchived: false,
              id: { in: subcategoryIds },
            },
            select: { id: true, categoryId: true },
          })
        : [];

    const transactionIdSet = new Set(existingTransactions.map((tx) => tx.id));
    const categoryIdSet = new Set(userCategories.map((category) => category.id));
    const subcategoryById = new Map<string, { id: string; categoryId: string }>(
      userSubcategories.map((subcategory) => [subcategory.id, subcategory]),
    );

    const validUpdates: Array<{
      transactionId: string;
      data: ClassificationUpdateData;
    }> = [];

    const failed: Array<{ transactionId: string; message: string }> = [];

    for (const item of dedupedItems) {
      const validationError = this.validateClassificationRequest({
        item,
        transactionIdSet,
        categoryIdSet,
        subcategoryById,
        requireSubcategory: options.requireSubcategory,
      });

      if (validationError) {
        failed.push({
          transactionId: item.transactionId,
          message: validationError,
        });
        continue;
      }

      const isUnclassified = item.categoryId === null || !item.categoryId;

      validUpdates.push({
        transactionId: item.transactionId,
        data: isUnclassified
          ? {
              categoryId: null,
              subcategoryId: null,
              classificationStatus: 'UNCLASSIFIED',
              confidenceScore: null,
            }
          : {
              categoryId: item.categoryId as string,
              subcategoryId: item.subcategoryId ?? null,
              classificationStatus: 'MANUAL',
              confidenceScore: null,
            },
      });
    }

    if (options.atomic && failed.length > 0) {
      throw new BadRequestException(
        `Invalid assignment payload. First error for transaction "${failed[0].transactionId}": ${failed[0].message}`,
      );
    }

    const successfullyUpdatedTransactionIds: string[] = [];

    if (options.atomic) {
      try {
        const atomicResult = await this.prisma.$transaction(
          validUpdates.map((update) =>
            this.prisma.transaction.update({
              where: { id: update.transactionId },
              data: update.data,
              select: { id: true },
            }),
          ),
        );

        successfullyUpdatedTransactionIds.push(
          ...atomicResult.map((item) => item.id),
        );
      } catch {
        throw new BadRequestException(
          'Failed to update transaction classifications atomically',
        );
      }
    } else {
      for (
        let offset = 0;
        offset < validUpdates.length;
        offset += BULK_UPDATE_CHUNK_SIZE
      ) {
        const chunk = validUpdates.slice(offset, offset + BULK_UPDATE_CHUNK_SIZE);

        try {
          const chunkResult = await this.prisma.$transaction(
            chunk.map((update) =>
              this.prisma.transaction.update({
                where: { id: update.transactionId },
                data: update.data,
                select: { id: true },
              }),
            ),
          );

          successfullyUpdatedTransactionIds.push(
            ...chunkResult.map((item) => item.id),
          );
        } catch {
          // Legacy non-atomic mode: isolate per-row failures.
          for (const update of chunk) {
            try {
              const updated = await this.prisma.transaction.update({
                where: { id: update.transactionId },
                data: update.data,
                select: { id: true },
              });
              successfullyUpdatedTransactionIds.push(updated.id);
            } catch {
              failed.push({
                transactionId: update.transactionId,
                message: 'Failed to update transaction classification',
              });
            }
          }
        }
      }
    }

    if (successfullyUpdatedTransactionIds.length === 0) {
      return {
        updatedCount: 0,
        failedCount: failed.length,
        updated: [],
        failed,
      };
    }

    const updatedTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        id: { in: successfullyUpdatedTransactionIds },
      },
      select: {
        id: true,
        categoryId: true,
        subcategoryId: true,
        classificationStatus: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const updatedTransactionById = new Map(
      updatedTransactions.map((tx) => [tx.id, tx]),
    );

    const updated: TransactionClassificationView[] = successfullyUpdatedTransactionIds
      .map((transactionId) => {
        const transaction = updatedTransactionById.get(transactionId);
        if (!transaction) return null;

        return {
          transactionId: transaction.id,
          categoryId: transaction.categoryId,
          categoryName: transaction.category?.name ?? null,
          subcategoryId: transaction.subcategoryId,
          subcategoryName: transaction.subcategory?.name ?? null,
          classificationStatus: transaction.classificationStatus,
          updatedAt: transaction.updatedAt.toISOString(),
        };
      })
      .filter((value): value is TransactionClassificationView => value !== null);

    return {
      updatedCount: updated.length,
      failedCount: failed.length,
      updated,
      failed,
    };
  }

  private validateClassificationRequest(input: {
    item: ClassificationAssignmentItem;
    transactionIdSet: Set<string>;
    categoryIdSet: Set<string>;
    subcategoryById: Map<string, { id: string; categoryId: string }>;
    requireSubcategory: boolean;
  }): string | null {
    const {
      item,
      transactionIdSet,
      categoryIdSet,
      subcategoryById,
      requireSubcategory,
    } = input;

    if (!transactionIdSet.has(item.transactionId)) {
      return 'Transaction not found for this user';
    }

    if (!Object.prototype.hasOwnProperty.call(item, 'categoryId')) {
      return 'categoryId must be provided (UUID or null)';
    }

    if (!item.categoryId) {
      if (item.subcategoryId) {
        return 'subcategoryId cannot be set when categoryId is null';
      }
      return null;
    }

    if (!categoryIdSet.has(item.categoryId)) {
      return 'Invalid categoryId';
    }

    if (requireSubcategory && !item.subcategoryId) {
      return 'subcategoryId is required when categoryId is set';
    }

    if (!item.subcategoryId) {
      return null;
    }

    const subcategory = subcategoryById.get(item.subcategoryId);
    if (!subcategory) {
      return 'Invalid subcategoryId';
    }

    if (subcategory.categoryId !== item.categoryId) {
      return 'subcategoryId does not belong to categoryId';
    }

    return null;
  }

  private async persistBudgetPlan(
    userId: string,
    budgetPlan: AssignTransactionsBudgetPlanDto,
  ): Promise<BudgetPlanPersistResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        timeZone: true,
        baseCurrency: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const normalizedCategoryBudgets = [
      ...new Map(
        (budgetPlan.categoryBudgets ?? []).map((item) => [
          item.categoryId,
          {
            categoryId: item.categoryId,
            plannedAmount: this.normalizePlannedAmount(item.plannedAmount),
          },
        ]),
      ).values(),
    ];

    const normalizedSubcategoryBudgets = [
      ...new Map(
        (budgetPlan.subcategoryBudgets ?? []).map((item) => [
          item.subcategoryId,
          {
            subcategoryId: item.subcategoryId,
            plannedAmount: this.normalizePlannedAmount(item.plannedAmount),
          },
        ]),
      ).values(),
    ];

    const hasMonthlyTarget = typeof budgetPlan.monthlyTarget === 'number';
    if (
      !hasMonthlyTarget &&
      normalizedCategoryBudgets.length === 0 &&
      normalizedSubcategoryBudgets.length === 0
    ) {
      throw new BadRequestException(
        'budgetPlan must include monthlyTarget and/or category/subcategory budgets',
      );
    }

    const categoryIds = normalizedCategoryBudgets.map((item) => item.categoryId);
    const subcategoryIds = normalizedSubcategoryBudgets.map(
      (item) => item.subcategoryId,
    );

    const [categories, subcategories] = await Promise.all([
      categoryIds.length
        ? this.prisma.budgetCategory.findMany({
            where: {
              userId,
              isArchived: false,
              id: { in: categoryIds },
            },
            select: { id: true },
          })
        : [],
      subcategoryIds.length
        ? this.prisma.budgetSubcategory.findMany({
            where: {
              userId,
              isArchived: false,
              id: { in: subcategoryIds },
            },
            select: { id: true, categoryId: true },
          })
        : [],
    ]);

    const categoryIdSet = new Set(categories.map((item) => item.id));
    for (const categoryId of categoryIds) {
      if (!categoryIdSet.has(categoryId)) {
        throw new BadRequestException(`Invalid categoryId in budgetPlan: ${categoryId}`);
      }
    }

    const subcategoryById = new Map<string, { id: string; categoryId: string }>(
      subcategories.map(
        (item): [string, { id: string; categoryId: string }] => [
          item.id,
          { id: item.id, categoryId: item.categoryId },
        ],
      ),
    );
    for (const subcategoryId of subcategoryIds) {
      if (!subcategoryById.has(subcategoryId)) {
        throw new BadRequestException(
          `Invalid subcategoryId in budgetPlan: ${subcategoryId}`,
        );
      }
    }

    const monthYm =
      budgetPlan.monthYm ?? this.resolveCurrentMonthYmForTimeZone(user.timeZone);

    const categoryTotal = normalizedCategoryBudgets.reduce(
      (sum, item) => sum + item.plannedAmount,
      0,
    );
    const subcategoryTotal = normalizedSubcategoryBudgets.reduce(
      (sum, item) => sum + item.plannedAmount,
      0,
    );

    const plannedTotal = hasMonthlyTarget
      ? this.normalizePlannedAmount(budgetPlan.monthlyTarget as number)
      : normalizedCategoryBudgets.length > 0
        ? this.normalizePlannedAmount(categoryTotal)
        : this.normalizePlannedAmount(subcategoryTotal);

    const persisted = await this.prisma.$transaction(async (tx) => {
      const budgetMonth = await tx.budgetMonth.upsert({
        where: {
          userId_monthYm: {
            userId,
            monthYm,
          },
        },
        create: {
          userId,
          monthYm,
          plannedTotal,
          expectedIncome: null,
          currency: user.baseCurrency,
          status: 'ACTIVE',
        },
        update: {
          plannedTotal,
          currency: user.baseCurrency,
        },
        select: {
          id: true,
          monthYm: true,
          plannedTotal: true,
        },
      });

      for (const item of normalizedCategoryBudgets) {
        await tx.categoryBudget.upsert({
          where: {
            budgetMonthId_categoryId: {
              budgetMonthId: budgetMonth.id,
              categoryId: item.categoryId,
            },
          },
          create: {
            budgetMonthId: budgetMonth.id,
            categoryId: item.categoryId,
            plannedAmount: item.plannedAmount,
            alert75: 75,
            alert90: 90,
            alert100: 100,
          },
          update: {
            plannedAmount: item.plannedAmount,
          },
        });
      }

      for (const item of normalizedSubcategoryBudgets) {
        await tx.subcategoryBudget.upsert({
          where: {
            budgetMonthId_subcategoryId: {
              budgetMonthId: budgetMonth.id,
              subcategoryId: item.subcategoryId,
            },
          },
          create: {
            budgetMonthId: budgetMonth.id,
            subcategoryId: item.subcategoryId,
            plannedAmount: item.plannedAmount,
            alert75: 75,
            alert90: 90,
            alert100: 100,
          },
          update: {
            plannedAmount: item.plannedAmount,
          },
        });
      }

      return budgetMonth;
    });

    return {
      monthYm: persisted.monthYm,
      plannedTotal: this.decimalToNumber(persisted.plannedTotal),
      categoryBudgetsUpserted: normalizedCategoryBudgets.length,
      subcategoryBudgetsUpserted: normalizedSubcategoryBudgets.length,
    };
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private normalizePlannedAmount(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException(
        'plannedAmount/monthlyTarget must be a finite number greater than or equal to 0',
      );
    }

    return Math.round(amount * 100) / 100;
  }

  private resolveCurrentMonthYmForTimeZone(timeZone: string): string {
    const resolvedTimeZone = timeZone?.trim() ? timeZone : 'UTC';
    let parts: Intl.DateTimeFormatPart[];

    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: resolvedTimeZone,
        year: 'numeric',
        month: '2-digit',
      }).formatToParts(new Date());
    } catch {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
      }).formatToParts(new Date());
    }

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    if (!year || !month) {
      throw new BadRequestException('Unable to resolve monthYm from user time zone');
    }

    return `${year}-${month}`;
  }

  private async ensureCategoryOwnership(
    userId: string,
    categoryId: string,
  ): Promise<{
    id: string;
    appCategoryId: string | null;
    isArchived: boolean;
  }> {
    const category = await this.prisma.budgetCategory.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      select: {
        id: true,
        appCategoryId: true,
        isArchived: true,
      },
    });

    if (!category) {
      throw new NotFoundException('User category not found');
    }

    return category;
  }

  private resolveDateRange(
    fromIso?: string,
    toIso?: string,
  ): { from: Date; to: Date } {
    const now = new Date();
    const defaultFrom = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );

    const from = fromIso ? new Date(fromIso) : defaultFrom;
    const to = toIso ? new Date(toIso) : now;

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    if (to < from) {
      throw new BadRequestException('"to" must be greater than or equal to "from"');
    }

    return { from, to };
  }

  private slugify(value: string, fallback: string): string {
    const normalized = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return normalized || fallback;
  }

  private buildUniqueSlugFromSet(
    usedSlugs: Set<string>,
    baseSlug: string,
    maxLength: number,
  ): string {
    const safeBase =
      baseSlug.slice(0, maxLength).replace(/^-+|-+$/g, '') || 'item';

    let candidate = safeBase;
    let suffixIndex = 2;

    while (usedSlugs.has(candidate)) {
      const suffix = `-${suffixIndex}`;
      candidate = `${safeBase.slice(0, maxLength - suffix.length)}${suffix}`;
      suffixIndex += 1;
    }

    return candidate;
  }

  private async resolveUniqueCategorySlugInMemory(
    userId: string,
    baseSlug: string,
    excludeCategoryId?: string,
  ): Promise<string> {
    const existingSlugs = await this.prisma.budgetCategory.findMany({
      where: excludeCategoryId
        ? { userId, NOT: { id: excludeCategoryId } }
        : { userId },
      select: { slug: true },
    });

    const usedSlugs = new Set(existingSlugs.map((item) => item.slug));
    return this.buildUniqueSlugFromSet(usedSlugs, baseSlug, 120);
  }

  private async resolveUniqueSubcategorySlugInMemory(
    userId: string,
    categoryId: string,
    baseSlug: string,
    excludeSubcategoryId?: string,
  ): Promise<string> {
    const existingSlugs = await this.prisma.budgetSubcategory.findMany({
      where: excludeSubcategoryId
        ? {
            userId,
            categoryId,
            NOT: { id: excludeSubcategoryId },
          }
        : {
            userId,
            categoryId,
          },
      select: { slug: true },
    });

    const usedSlugs = new Set(existingSlugs.map((item) => item.slug));
    return this.buildUniqueSlugFromSet(usedSlugs, baseSlug, 120);
  }

  private normalizeColorHex(value?: string): string {
    return (value ?? DEFAULT_COLOR_HEX).toUpperCase();
  }

  private decimalToNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (
      value &&
      typeof value === 'object' &&
      'toNumber' in value &&
      typeof (value as { toNumber: unknown }).toNumber === 'function'
    ) {
      return (value as { toNumber: () => number }).toNumber();
    }

    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
