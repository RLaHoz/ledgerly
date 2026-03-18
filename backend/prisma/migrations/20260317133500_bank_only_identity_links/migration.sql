-- Drop unique constraint that prevented multiple provider identities per user/provider.
DROP INDEX IF EXISTS "bank_provider_users_user_id_provider_id_key";

-- Allow pending identity links before canonical user resolution.
ALTER TABLE "bank_provider_users"
  ALTER COLUMN "user_id" DROP NOT NULL;

-- Allow consent attempts to exist before canonical user resolution.
ALTER TABLE "bank_consent_attempts"
  ALTER COLUMN "user_id" DROP NOT NULL;
