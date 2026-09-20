CREATE TABLE IF NOT EXISTS customer_accounts (
 id VARCHAR(191) PRIMARY KEY,
 email VARCHAR(254) NOT NULL UNIQUE,
 name VARCHAR(191) NOT NULL,
 phone VARCHAR(32) NOT NULL,
 password_hash TEXT NOT NULL,
 salt TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_role_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_role_check CHECK(role IN ('admin','guest','customer'));
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS customer_id VARCHAR(191);
ALTER TABLE sessions ADD CONSTRAINT sessions_customer_fk FOREIGN KEY (customer_id) REFERENCES customer_accounts(id);
