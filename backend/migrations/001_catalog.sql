CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, revision INT NOT NULL DEFAULT 1, data JSON NOT NULL, CONSTRAINT app_state_id_check CHECK(id=1));
CREATE TABLE IF NOT EXISTS admin_account (id INT PRIMARY KEY, password_hash TEXT NOT NULL, salt TEXT NOT NULL, CONSTRAINT admin_account_id_check CHECK(id=1));
CREATE TABLE IF NOT EXISTS sessions (token VARCHAR(191) PRIMARY KEY, role VARCHAR(20) NOT NULL, expires_at TIMESTAMP NOT NULL, CONSTRAINT sessions_role_check CHECK(role IN ('admin','guest')));
