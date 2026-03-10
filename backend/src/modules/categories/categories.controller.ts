import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { AssignTransactionsDto } from './dto/assign-transactions.dto';
import { BulkUpdateTransactionClassificationDto } from './dto/bulk-update-transaction-classification.dto';
import { CreateUserCategoryDto } from './dto/create-user-category.dto';
import { CreateUserSubcategoryDto } from './dto/create-user-subcategory.dto';
import { ListUserCategoriesQueryDto } from './dto/list-user-categories-query.dto';
import { ReorderUserCategoriesDto } from './dto/reorder-user-categories.dto';
import { ReorderUserSubcategoriesDto } from './dto/reorder-user-subcategories.dto';
import { UpdateTransactionClassificationDto } from './dto/update-transaction-classification.dto';
import { UpdateUserCategoryDto } from './dto/update-user-category.dto';
import { UpdateUserSubcategoryDto } from './dto/update-user-subcategory.dto';
import { CategoryManagementService } from './services/category-management.service';
import { CategoryTransactionCsvIngestResponseDto } from './dto/category-transaction-csv-ingest-response.dto';
import { CategoryTransactionImportService } from './services/category-transaction-import.service';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoryManagementService: CategoryManagementService,
    private readonly categoryTransactionImportService: CategoryTransactionImportService,
  ) {}

  @Get('app-categories')
  getAppCategories() {
    return this.categoryManagementService.listAppCategories();
  }

  @Post('user-categories/bootstrap-from-app')
  bootstrapUserCategories(@CurrentUserId() userId: string) {
    return this.categoryManagementService.bootstrapUserCategoriesFromApp(
      userId,
    );
  }

  @Get('user-categories')
  getUserCategories(
    @CurrentUserId() userId: string,
    @Query() query: ListUserCategoriesQueryDto,
  ) {
    return this.categoryManagementService.listUserCategories(userId, query);
  }

  @Post('user-categories')
  createUserCategory(
    @CurrentUserId() userId: string,
    @Body() dto: CreateUserCategoryDto,
  ) {
    return this.categoryManagementService.createUserCategory(userId, dto);
  }

  @Patch('user-categories/reorder')
  reorderUserCategories(
    @CurrentUserId() userId: string,
    @Body() dto: ReorderUserCategoriesDto,
  ) {
    return this.categoryManagementService.reorderUserCategories(userId, dto);
  }

  @Patch('user-categories/:categoryId')
  updateUserCategory(
    @CurrentUserId() userId: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() dto: UpdateUserCategoryDto,
  ) {
    return this.categoryManagementService.updateUserCategory(
      userId,
      categoryId,
      dto,
    );
  }

  @Delete('user-categories/:categoryId')
  archiveUserCategory(
    @CurrentUserId() userId: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
  ) {
    return this.categoryManagementService.archiveUserCategory(
      userId,
      categoryId,
    );
  }

  @Post('user-categories/:categoryId/restore')
  restoreUserCategory(
    @CurrentUserId() userId: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
  ) {
    return this.categoryManagementService.restoreUserCategory(
      userId,
      categoryId,
    );
  }

  @Post('user-categories/:categoryId/subcategories')
  createUserSubcategory(
    @CurrentUserId() userId: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() dto: CreateUserSubcategoryDto,
  ) {
    return this.categoryManagementService.createUserSubcategory(
      userId,
      categoryId,
      dto,
    );
  }

  @Patch('user-categories/:categoryId/subcategories/reorder')
  reorderUserSubcategories(
    @CurrentUserId() userId: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() dto: ReorderUserSubcategoriesDto,
  ) {
    return this.categoryManagementService.reorderUserSubcategories(
      userId,
      categoryId,
      dto,
    );
  }

  @Patch('user-subcategories/:subcategoryId')
  updateUserSubcategory(
    @CurrentUserId() userId: string,
    @Param('subcategoryId', new ParseUUIDPipe()) subcategoryId: string,
    @Body() dto: UpdateUserSubcategoryDto,
  ) {
    return this.categoryManagementService.updateUserSubcategory(
      userId,
      subcategoryId,
      dto,
    );
  }

  @Delete('user-subcategories/:subcategoryId')
  archiveUserSubcategory(
    @CurrentUserId() userId: string,
    @Param('subcategoryId', new ParseUUIDPipe()) subcategoryId: string,
  ) {
    return this.categoryManagementService.archiveUserSubcategory(
      userId,
      subcategoryId,
    );
  }

  @Post('user-subcategories/:subcategoryId/restore')
  restoreUserSubcategory(
    @CurrentUserId() userId: string,
    @Param('subcategoryId', new ParseUUIDPipe()) subcategoryId: string,
  ) {
    return this.categoryManagementService.restoreUserSubcategory(
      userId,
      subcategoryId,
    );
  }

  @Patch('transactions/classification/bulk')
  /**
   * @deprecated Use PATCH /categories/transactions/assign instead.
   */
  bulkUpdateTransactionClassification(
    @CurrentUserId() userId: string,
    @Body() dto: BulkUpdateTransactionClassificationDto,
  ) {
    return this.categoryManagementService.assignTransactions(
      userId,
      {
        items: dto.items,
        options: {
          atomic: false,
          requireSubcategory: false,
        },
      },
    );
  }

  @Patch('transactions/assign')
  assignTransactions(
    @CurrentUserId() userId: string,
    @Body() dto: AssignTransactionsDto,
  ) {
    return this.categoryManagementService.assignTransactions(userId, dto);
  }

  @Patch('transactions/:transactionId/classification')
  updateTransactionClassification(
    @CurrentUserId() userId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() dto: UpdateTransactionClassificationDto,
  ) {
    return this.categoryManagementService.updateTransactionClassification(
      userId,
      transactionId,
      dto,
    );
  }

  @Post('transactions/csv')
  @UseInterceptors(FileInterceptor('file'))
  async ingestTransactionsCsv(
    @CurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CategoryTransactionCsvIngestResponseDto> {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    return this.categoryTransactionImportService.ingestCsv(userId, file.buffer);
  }
}
