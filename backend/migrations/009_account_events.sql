CREATE TABLE IF NOT EXISTS account_events (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 account_id VARCHAR(191) NOT NULL,
 type VARCHAR(40) NOT NULL,
 created_at VARCHAR(40) NOT NULL,
 data JSON NOT NULL,
 INDEX account_events_account (account_id, id)
);
CREATE TABLE IF NOT EXISTS customer_loyalty (
 account_id VARCHAR(191) PRIMARY KEY,
 data JSON NOT NULL
);
