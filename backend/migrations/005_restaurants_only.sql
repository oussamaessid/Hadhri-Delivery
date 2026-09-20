DELETE FROM merchants WHERE kind='shops';
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_kind_check;
ALTER TABLE merchants ADD CONSTRAINT merchants_kind_check CHECK(kind IN('restaurants'));
