CREATE TABLE IF NOT EXISTS merchants(id VARCHAR(191) PRIMARY KEY,kind VARCHAR(20) NOT NULL,data JSON NOT NULL,CONSTRAINT merchants_kind_check CHECK(kind IN('restaurants','shops')));
CREATE TABLE IF NOT EXISTS categories(id VARCHAR(191) PRIMARY KEY,merchant_id VARCHAR(191) NOT NULL,data JSON NOT NULL,UNIQUE(id,merchant_id),FOREIGN KEY(merchant_id) REFERENCES merchants(id));
CREATE TABLE IF NOT EXISTS products(id VARCHAR(191) PRIMARY KEY,merchant_id VARCHAR(191) NOT NULL,category_id VARCHAR(191) NOT NULL,data JSON NOT NULL,FOREIGN KEY(category_id,merchant_id) REFERENCES categories(id,merchant_id));
ALTER TABLE products ADD INDEX IF NOT EXISTS products_merchant_idx (merchant_id);
ALTER TABLE categories ADD INDEX IF NOT EXISTS categories_merchant_idx (merchant_id);
CREATE TABLE IF NOT EXISTS customers(id VARCHAR(191) PRIMARY KEY,data JSON NOT NULL);
CREATE TABLE IF NOT EXISTS drivers(id VARCHAR(191) PRIMARY KEY,data JSON NOT NULL);
CREATE TABLE IF NOT EXISTS orders(
 id VARCHAR(191) PRIMARY KEY,
 data JSON NOT NULL,
 request_id VARCHAR(191) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data, '$.requestId'))) STORED,
 client_session_id VARCHAR(191) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data, '$.clientSessionId'))) STORED,
 order_date VARCHAR(191) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data, '$.date'))) STORED,
 UNIQUE INDEX orders_request_idx (request_id),
 INDEX orders_session_idx (client_session_id),
 INDEX orders_date_idx (order_date)
);
CREATE TABLE IF NOT EXISTS notifications(id VARCHAR(191) PRIMARY KEY,data JSON NOT NULL);
