/*
  Warnings:

  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AppAuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "AppAuthAttemptStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuthClientType" AS ENUM ('WEB', 'NATIVE');

-- AlterTable
ALTER TABLE "bank_consent_attempts" ADD COLUMN     "client" "AuthClientType" NOT NULL DEFAULT 'WEB';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash",
ADD COLUMN     "avatar_url" VARCHAR(512);

-- CreateTable
CREATE TABLE "user_auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AppAuthProvider" NOT NULL,
    "provider_subject" VARCHAR(255) NOT NULL,
    "email" VARCHAR(254),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "display_name" VARCHAR(120),
    "avatar_url" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "provider" "AppAuthProvider" NOT NULL,
    "client" "AuthClientType" NOT NULL,
    "state" VARCHAR(255) NOT NULL,
    "nonce" VARCHAR(255) NOT NULL,
    "code_verifier" VARCHAR(255) NOT NULL,
    "redirect_uri" VARCHAR(512) NOT NULL,
    "bridge_target_url" VARCHAR(512) NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "AppAuthAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,

    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_auth_identities_user_id_provider_idx" ON "user_auth_identities"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_identities_provider_provider_subject_key" ON "user_auth_identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "auth_attempts_state_key" ON "auth_attempts"("state");

-- CreateIndex
CREATE INDEX "auth_attempts_provider_status_expires_at_idx" ON "auth_attempts"("provider", "status", "expires_at");

-- CreateIndex
CREATE INDEX "auth_attempts_user_id_provider_idx" ON "auth_attempts"("user_id", "provider");

-- CreateIndex
CREATE INDEX "bank_consent_attempts_user_id_client_status_requested_at_idx" ON "bank_consent_attempts"("user_id", "client", "status", "requested_at");

-- AddForeignKey
ALTER TABLE "user_auth_identities" ADD CONSTRAINT "user_auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_attempts" ADD CONSTRAINT "auth_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
