-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BudgetMonthStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "TransactionSourceType" AS ENUM ('CSV', 'MANUAL', 'BANK_API');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('AUTO_CLASSIFICATION', 'THRESHOLD_ALERT', 'ANOMALY_DETECTION');

-- CreateEnum
CREATE TYPE "RuleOutcome" AS ENUM ('APPLIED', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "RuleCreatedBy" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('WARNING', 'CRITICAL', 'INFO');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('CSV_UPLOAD', 'BANK_PULL', 'WEBHOOK_REPLAY');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "BankProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('CONNECTED', 'REVOKED', 'ERROR', 'SYNCING');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT', 'LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "base_currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "time_zone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" UUID NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "month_start_day" INTEGER NOT NULL DEFAULT 1,
    "sync_frequency_minutes" INTEGER NOT NULL DEFAULT 15,
    "notify_budget_warnings" BOOLEAN NOT NULL DEFAULT true,
    "notify_critical_only" BOOLEAN NOT NULL DEFAULT false,
    "notify_weekly_report" BOOLEAN NOT NULL DEFAULT true,
    "notify_unusual_spending" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "budget_months" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "month_ym" CHAR(7) NOT NULL,
    "planned_total" DECIMAL(14,2) NOT NULL,
    "expected_income" DECIMAL(14,2),
    "currency" CHAR(3) NOT NULL,
    "status" "BudgetMonthStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budget_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "icon" VARCHAR(64) NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_budgets" (
    "id" UUID NOT NULL,
    "budget_month_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "planned_amount" DECIMAL(14,2) NOT NULL,
    "alert_75" INTEGER NOT NULL DEFAULT 75,
    "alert_90" INTEGER NOT NULL DEFAULT 90,
    "alert_100" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bank_account_id" UUID,
    "source_type" "TransactionSourceType" NOT NULL,
    "external_tx_id" VARCHAR(255),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "booking_date" DATE,
    "amount_signed" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "merchant" VARCHAR(255),
    "description" TEXT NOT NULL,
    "category_id" UUID,
    "is_transfer" BOOLEAN NOT NULL DEFAULT false,
    "is_pending" BOOLEAN NOT NULL DEFAULT false,
    "dedupe_hash" VARCHAR(255) NOT NULL,
    "raw_ref_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "RuleType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "condition_json" JSONB NOT NULL,
    "action_json" JSONB NOT NULL,
    "created_by" "RuleCreatedBy" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_executions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "outcome" "RuleOutcome" NOT NULL,
    "message" VARCHAR(255),
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_alerts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rule_id" UUID,
    "budget_month_id" UUID,
    "category_id" UUID,
    "severity" "AlertSeverity" NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "rule_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "SyncSource" NOT NULL,
    "bank_connection_id" UUID,
    "status" "SyncStatus" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "inserted_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "metadata_json" JSONB,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_providers" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" "BankProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "provider_connection_id" VARCHAR(255) NOT NULL,
    "encrypted_access_token" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT,
    "token_expires_at" TIMESTAMPTZ(6),
    "consent_scopes_json" JSONB NOT NULL,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "bank_connection_id" UUID NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "mask" VARCHAR(16),
    "type" "BankAccountType" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions_raw" (
    "id" UUID NOT NULL,
    "bank_connection_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "provider_tx_id" VARCHAR(255) NOT NULL,
    "payload_json" JSONB NOT NULL,
    "booked_at" TIMESTAMPTZ(6),
    "amount_signed" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "merchant_name" VARCHAR(255),
    "description" TEXT,
    "is_pending" BOOLEAN NOT NULL DEFAULT false,
    "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_sync_cursors" (
    "id" UUID NOT NULL,
    "bank_connection_id" UUID NOT NULL,
    "cursor_value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "external_event_id" VARCHAR(255) NOT NULL,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "payload_json" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "error_text" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "budget_months_user_id_month_ym_idx" ON "budget_months"("user_id", "month_ym");

-- CreateIndex
CREATE UNIQUE INDEX "budget_months_user_id_month_ym_key" ON "budget_months"("user_id", "month_ym");

-- CreateIndex
CREATE INDEX "budget_categories_user_id_sort_order_idx" ON "budget_categories"("user_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "budget_categories_user_id_slug_key" ON "budget_categories"("user_id", "slug");

-- CreateIndex
CREATE INDEX "category_budgets_category_id_idx" ON "category_budgets"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_budgets_budget_month_id_category_id_key" ON "category_budgets"("budget_month_id", "category_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_occurred_at_idx" ON "transactions"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_category_id_occurred_at_idx" ON "transactions"("user_id", "category_id", "occurred_at");

-- CreateIndex
CREATE INDEX "transactions_bank_account_id_occurred_at_idx" ON "transactions"("bank_account_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_user_id_dedupe_hash_key" ON "transactions"("user_id", "dedupe_hash");

-- CreateIndex
CREATE INDEX "rules_user_id_enabled_priority_idx" ON "rules"("user_id", "enabled", "priority");

-- CreateIndex
CREATE INDEX "rule_executions_transaction_id_idx" ON "rule_executions"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "rule_executions_rule_id_transaction_id_key" ON "rule_executions"("rule_id", "transaction_id");

-- CreateIndex
CREATE INDEX "rule_alerts_user_id_status_triggered_at_idx" ON "rule_alerts"("user_id", "status", "triggered_at");

-- CreateIndex
CREATE INDEX "rule_alerts_budget_month_id_category_id_idx" ON "rule_alerts"("budget_month_id", "category_id");

-- CreateIndex
CREATE INDEX "sync_runs_user_id_started_at_idx" ON "sync_runs"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "sync_runs_bank_connection_id_started_at_idx" ON "sync_runs"("bank_connection_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "bank_providers_code_key" ON "bank_providers"("code");

-- CreateIndex
CREATE INDEX "bank_connections_user_id_status_idx" ON "bank_connections"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_connections_provider_id_provider_connection_id_key" ON "bank_connections"("provider_id", "provider_connection_id");

-- CreateIndex
CREATE INDEX "bank_accounts_bank_connection_id_is_active_idx" ON "bank_accounts"("bank_connection_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_bank_connection_id_provider_account_id_key" ON "bank_accounts"("bank_connection_id", "provider_account_id");

-- CreateIndex
CREATE INDEX "bank_transactions_raw_bank_account_id_booked_at_idx" ON "bank_transactions_raw"("bank_account_id", "booked_at");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_raw_bank_connection_id_provider_tx_id_key" ON "bank_transactions_raw"("bank_connection_id", "provider_tx_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_sync_cursors_bank_connection_id_key" ON "bank_sync_cursors"("bank_connection_id");

-- CreateIndex
CREATE INDEX "webhook_events_status_received_at_idx" ON "webhook_events"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_id_external_event_id_key" ON "webhook_events"("provider_id", "external_event_id");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_budget_month_id_fkey" FOREIGN KEY ("budget_month_id") REFERENCES "budget_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_raw_ref_id_fkey" FOREIGN KEY ("raw_ref_id") REFERENCES "bank_transactions_raw"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_executions" ADD CONSTRAINT "rule_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_executions" ADD CONSTRAINT "rule_executions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_alerts" ADD CONSTRAINT "rule_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_alerts" ADD CONSTRAINT "rule_alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_alerts" ADD CONSTRAINT "rule_alerts_budget_month_id_fkey" FOREIGN KEY ("budget_month_id") REFERENCES "budget_months"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_alerts" ADD CONSTRAINT "rule_alerts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_bank_connection_id_fkey" FOREIGN KEY ("bank_connection_id") REFERENCES "bank_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "bank_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_connection_id_fkey" FOREIGN KEY ("bank_connection_id") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions_raw" ADD CONSTRAINT "bank_transactions_raw_bank_connection_id_fkey" FOREIGN KEY ("bank_connection_id") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions_raw" ADD CONSTRAINT "bank_transactions_raw_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sync_cursors" ADD CONSTRAINT "bank_sync_cursors_bank_connection_id_fkey" FOREIGN KEY ("bank_connection_id") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "bank_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
