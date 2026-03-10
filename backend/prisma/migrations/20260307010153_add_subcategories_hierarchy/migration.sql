-- DropIndex
DROP INDEX "budget_categories_user_id_sort_order_idx";

-- DropIndex
DROP INDEX "rule_alerts_budget_month_id_category_id_idx";

-- AlterTable
ALTER TABLE "category_suggestions" ADD COLUMN     "suggested_subcategory_name" VARCHAR(100),
ADD COLUMN     "suggested_subcategory_slug" VARCHAR(120);

-- AlterTable
ALTER TABLE "rule_alerts" ADD COLUMN     "subcategory_id" UUID;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "subcategory_id" UUID;

-- CreateTable
CREATE TABLE "app_subcategory_list" (
    "id" UUID NOT NULL,
    "app_category_id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "ion_icon" VARCHAR(64) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_subcategory_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_subcategories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "app_subcategory_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "ion_icon" VARCHAR(64) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budget_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategory_budgets" (
    "id" UUID NOT NULL,
    "budget_month_id" UUID NOT NULL,
    "subcategory_id" UUID NOT NULL,
    "planned_amount" DECIMAL(14,2) NOT NULL,
    "alert_75" INTEGER NOT NULL DEFAULT 75,
    "alert_90" INTEGER NOT NULL DEFAULT 90,
    "alert_100" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subcategory_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_subcategory_list_app_category_id_is_active_sort_order_idx" ON "app_subcategory_list"("app_category_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "app_subcategory_list_app_category_id_slug_key" ON "app_subcategory_list"("app_category_id", "slug");

-- CreateIndex
CREATE INDEX "budget_subcategories_user_id_category_id_is_archived_sort_o_idx" ON "budget_subcategories"("user_id", "category_id", "is_archived", "sort_order");

-- CreateIndex
CREATE INDEX "budget_subcategories_category_id_is_archived_idx" ON "budget_subcategories"("category_id", "is_archived");

-- CreateIndex
CREATE INDEX "budget_subcategories_app_subcategory_id_idx" ON "budget_subcategories"("app_subcategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_subcategories_user_id_category_id_slug_key" ON "budget_subcategories"("user_id", "category_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "budget_subcategories_user_id_app_subcategory_id_key" ON "budget_subcategories"("user_id", "app_subcategory_id");

-- CreateIndex
CREATE INDEX "subcategory_budgets_subcategory_id_idx" ON "subcategory_budgets"("subcategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "subcategory_budgets_budget_month_id_subcategory_id_key" ON "subcategory_budgets"("budget_month_id", "subcategory_id");

-- CreateIndex
CREATE INDEX "budget_categories_user_id_is_archived_sort_order_idx" ON "budget_categories"("user_id", "is_archived", "sort_order");

-- CreateIndex
CREATE INDEX "rule_alerts_budget_month_id_category_id_subcategory_id_idx" ON "rule_alerts"("budget_month_id", "category_id", "subcategory_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_classification_status_occurred_at_idx" ON "transactions"("user_id", "classification_status", "occurred_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_subcategory_id_occurred_at_idx" ON "transactions"("user_id", "subcategory_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "app_subcategory_list" ADD CONSTRAINT "app_subcategory_list_app_category_id_fkey" FOREIGN KEY ("app_category_id") REFERENCES "app_category_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_subcategories" ADD CONSTRAINT "budget_subcategories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_subcategories" ADD CONSTRAINT "budget_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_subcategories" ADD CONSTRAINT "budget_subcategories_app_subcategory_id_fkey" FOREIGN KEY ("app_subcategory_id") REFERENCES "app_subcategory_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_budgets" ADD CONSTRAINT "subcategory_budgets_budget_month_id_fkey" FOREIGN KEY ("budget_month_id") REFERENCES "budget_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_budgets" ADD CONSTRAINT "subcategory_budgets_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "budget_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "budget_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_alerts" ADD CONSTRAINT "rule_alerts_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "budget_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
