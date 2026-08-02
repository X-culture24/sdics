-- Rollback dataset layer
DROP TABLE IF EXISTS dataset_column_mappings CASCADE;
DROP TABLE IF EXISTS dataset_validation_errors CASCADE;
DROP TABLE IF EXISTS dataset_records CASCADE;
DROP TABLE IF EXISTS dataset_uploads CASCADE;
