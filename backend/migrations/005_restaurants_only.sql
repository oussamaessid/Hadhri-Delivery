-- Preserve legacy shops and their products as merchants in the unified catalogue.
UPDATE merchants SET kind='restaurants' WHERE kind='shops';
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_kind_check;
ALTER TABLE merchants ADD CONSTRAINT merchants_kind_check CHECK(kind IN('restaurants'));
