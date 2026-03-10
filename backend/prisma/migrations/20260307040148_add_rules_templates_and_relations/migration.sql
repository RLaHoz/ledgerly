-- CreateEnum
CREATE TYPE "RuleTemplateStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RuleMatchMode" AS ENUM ('KEYWORD_ONLY', 'REGEX_ONLY', 'KEYWORD_REGEX_HYBRID');

-- DropIndex
DROP INDEX "rule_executions_rule_id_transaction_id_key";

-- DropIndex
DROP INDEX "rule_executions_transaction_id_idx";

-- DropIndex
DROP INDEX "rules_user_id_enabled_priority_idx";

-- AlterTable
ALTER TABLE "rule_executions" ADD COLUMN     "match_details_json" JSONB;

-- AlterTable
ALTER TABLE "rules" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "is_system_managed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "match_mode" "RuleMatchMode" NOT NULL DEFAULT 'KEYWORD_REGEX_HYBRID',
ADD COLUMN     "source_template_id" UUID,
ADD COLUMN     "source_template_version" INTEGER,
ADD COLUMN     "target_category_id" UUID,
ADD COLUMN     "target_subcategory_id" UUID;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "classified_at" TIMESTAMPTZ(6),
ADD COLUMN     "classified_by_rule_id" UUID;

-- CreateTable
CREATE TABLE "app_rule_templates" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "RuleType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "match_mode" "RuleMatchMode" NOT NULL DEFAULT 'KEYWORD_REGEX_HYBRID',
    "condition_json" JSONB NOT NULL,
    "action_json" JSONB NOT NULL,
    "target_app_category_id" UUID,
    "target_app_subcategory_id" UUID,
    "is_default_for_new_users" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "RuleTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_rule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_rule_templates_status_is_default_for_new_users_idx" ON "app_rule_templates"("status", "is_default_for_new_users");

-- CreateIndex
CREATE INDEX "app_rule_templates_type_enabled_priority_idx" ON "app_rule_templates"("type", "enabled", "priority");

-- CreateIndex
CREATE INDEX "app_rule_templates_target_app_category_id_target_app_subcat_idx" ON "app_rule_templates"("target_app_category_id", "target_app_subcategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_rule_templates_code_version_key" ON "app_rule_templates"("code", "version");

-- CreateIndex
CREATE INDEX "rule_executions_rule_id_transaction_id_triggered_at_idx" ON "rule_executions"("rule_id", "transaction_id", "triggered_at");

-- CreateIndex
CREATE INDEX "rule_executions_transaction_id_triggered_at_idx" ON "rule_executions"("transaction_id", "triggered_at");

-- CreateIndex
CREATE INDEX "rules_user_id_deleted_at_type_enabled_priority_idx" ON "rules"("user_id", "deleted_at", "type", "enabled", "priority");

-- CreateIndex
CREATE INDEX "rules_user_id_created_by_enabled_idx" ON "rules"("user_id", "created_by", "enabled");

-- CreateIndex
CREATE INDEX "rules_source_template_id_idx" ON "rules"("source_template_id");

-- CreateIndex
CREATE INDEX "rules_target_category_id_target_subcategory_id_idx" ON "rules"("target_category_id", "target_subcategory_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_classified_by_rule_id_occurred_at_idx" ON "transactions"("user_id", "classified_by_rule_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "app_rule_templates" ADD CONSTRAINT "app_rule_templates_target_app_category_id_fkey" FOREIGN KEY ("target_app_category_id") REFERENCES "app_category_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_rule_templates" ADD CONSTRAINT "app_rule_templates_target_app_subcategory_id_fkey" FOREIGN KEY ("target_app_subcategory_id") REFERENCES "app_subcategory_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_classified_by_rule_id_fkey" FOREIGN KEY ("classified_by_rule_id") REFERENCES "rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "app_rule_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_target_category_id_fkey" FOREIGN KEY ("target_category_id") REFERENCES "budget_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_target_subcategory_id_fkey" FOREIGN KEY ("target_subcategory_id") REFERENCES "budget_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
