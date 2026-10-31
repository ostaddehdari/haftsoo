DROP TABLE IF EXISTS catalog.import_jobs;
DROP TABLE IF EXISTS catalog.field_rules;
DROP TABLE IF EXISTS catalog.category_fields;
DROP TABLE IF EXISTS catalog.field_options;
DROP TABLE IF EXISTS catalog.field_definitions;
DROP TRIGGER IF EXISTS categories_guard_parent ON catalog.categories;
DROP FUNCTION IF EXISTS catalog.guard_category_parent();
DROP TABLE IF EXISTS catalog.categories;
DROP TABLE IF EXISTS catalog.releases;
