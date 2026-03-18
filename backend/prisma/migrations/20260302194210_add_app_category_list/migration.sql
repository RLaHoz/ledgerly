/*
  Warnings:

  - You are about to drop the column `color` on the `budget_categories` table. All the data in the column will be lost.
  - You are about to drop the column `icon` on the `budget_categories` table. All the data in the column will be lost.
  - Added the required column `color_hex` to the `budget_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ion_icon` to the `budget_categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "budget_categories" DROP COLUMN "color",
DROP COLUMN "icon",
ADD COLUMN     "app_category_id" UUID,
ADD COLUMN     "color_hex" VARCHAR(7) NOT NULL,
ADD COLUMN     "ion_icon" VARCHAR(64) NOT NULL;

-- CreateTable
CREATE TABLE "app_category_list" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "ion_icon" VARCHAR(64) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_category_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_category_list_slug_key" ON "app_category_list"("slug");

-- CreateIndex
CREATE INDEX "app_category_list_is_active_sort_order_idx" ON "app_category_list"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "budget_categories_app_category_id_idx" ON "budget_categories"("app_category_id");

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_app_category_id_fkey" FOREIGN KEY ("app_category_id") REFERENCES "app_category_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;
