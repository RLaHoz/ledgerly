-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BankConsentAttemptStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "bank_connections" ADD COLUMN     "bank_provider_user_id" UUID,
ADD COLUMN     "consented_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_error_code" VARCHAR(120),
ADD COLUMN     "last_error_message" TEXT,
ADD COLUMN     "revoked_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" VARCHAR(255);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(128) NOT NULL,
    "device_id" VARCHAR(120),
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(64),
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_provider_users" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_provider_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_consent_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "bank_provider_user_id" UUID NOT NULL,
    "state" VARCHAR(255) NOT NULL,
    "authorize_url" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "BankConsentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "job_ids_json" JSONB,
    "error_message" TEXT,

    CONSTRAINT "bank_consent_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_sessions_user_id_status_expires_at_idx" ON "user_sessions"("user_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_key" ON "user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "bank_provider_users_user_id_provider_id_idx" ON "bank_provider_users"("user_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_provider_users_user_id_provider_id_key" ON "bank_provider_users"("user_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_provider_users_provider_id_provider_user_id_key" ON "bank_provider_users"("provider_id", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_consent_attempts_state_key" ON "bank_consent_attempts"("state");

-- CreateIndex
CREATE INDEX "bank_consent_attempts_user_id_status_requested_at_idx" ON "bank_consent_attempts"("user_id", "status", "requested_at");

-- CreateIndex
CREATE INDEX "bank_consent_attempts_provider_id_status_idx" ON "bank_consent_attempts"("provider_id", "status");

-- CreateIndex
CREATE INDEX "bank_consent_attempts_bank_provider_user_id_idx" ON "bank_consent_attempts"("bank_provider_user_id");

-- CreateIndex
CREATE INDEX "bank_connections_bank_provider_user_id_status_idx" ON "bank_connections"("bank_provider_user_id", "status");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_provider_users" ADD CONSTRAINT "bank_provider_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_provider_users" ADD CONSTRAINT "bank_provider_users_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "bank_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_consent_attempts" ADD CONSTRAINT "bank_consent_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_consent_attempts" ADD CONSTRAINT "bank_consent_attempts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "bank_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_consent_attempts" ADD CONSTRAINT "bank_consent_attempts_bank_provider_user_id_fkey" FOREIGN KEY ("bank_provider_user_id") REFERENCES "bank_provider_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_bank_provider_user_id_fkey" FOREIGN KEY ("bank_provider_user_id") REFERENCES "bank_provider_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
