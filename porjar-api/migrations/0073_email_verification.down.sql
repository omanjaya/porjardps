DROP INDEX IF EXISTS idx_users_email_verification_token;

ALTER TABLE users
    DROP COLUMN IF EXISTS email_verification_token_expires_at,
    DROP COLUMN IF EXISTS email_verification_token,
    DROP COLUMN IF EXISTS email_verified_at;
