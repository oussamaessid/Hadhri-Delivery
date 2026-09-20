-- Revert the removed email verification feature without deleting customer accounts.
DROP TABLE IF EXISTS customer_email_challenges;
ALTER TABLE customer_accounts DROP COLUMN IF EXISTS email_verified_at;
