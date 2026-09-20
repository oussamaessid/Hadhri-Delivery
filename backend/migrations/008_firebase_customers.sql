ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(191);
ALTER TABLE customer_accounts ADD UNIQUE INDEX IF NOT EXISTS customer_accounts_firebase_uid (firebase_uid);
ALTER TABLE customer_accounts MODIFY COLUMN password_hash TEXT NULL;
ALTER TABLE customer_accounts MODIFY COLUMN salt TEXT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(191);
