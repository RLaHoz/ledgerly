-- CreateEnum
CREATE TYPE "ClassificationStatus" AS ENUM ('AUTO', 'MANUAL', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "classification_status" "ClassificationStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
ADD COLUMN     "confidence_score" DECIMAL(5,4),
ADD COLUMN     "import_run_id" UUID;

-- CreateTable
CREATE TABLE "import_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'csv',
    "status" "ImportRunStatus" NOT NULL,
    "received_count" INTEGER NOT NULL DEFAULT 0,
    "inserted_count" INTEGER NOT NULL DEFAULT 0,
    "duplicated_count" INTEGER NOT NULL DEFAULT 0,
    "classified_count" INTEGER NOT NULL DEFAULT 0,
    "unclassified_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "error_summary" TEXT,

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_suggestions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "suggested_name" VARCHAR(100) NOT NULL,
    "suggested_slug" VARCHAR(120) NOT NULL,
    "ion_icon" VARCHAR(64) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence_score" DECIMAL(5,4) NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "category_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_runs_user_id_started_at_idx" ON "import_runs"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "category_suggestions_user_id_status_created_at_idx" ON "category_suggestions"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "category_suggestions_transaction_id_idx" ON "category_suggestions"("transaction_id");

-- AddForeignKey
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_suggestions" ADD CONSTRAINT "category_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_suggestions" ADD CONSTRAINT "category_suggestions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
