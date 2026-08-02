-- Dataset Uploads: Metadata about each import
CREATE TABLE dataset_uploads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county              VARCHAR(255) NOT NULL,
    filename            VARCHAR(500) NOT NULL,
    uploaded_by         UUID NOT NULL REFERENCES users(id),
    upload_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status              VARCHAR(20) NOT NULL DEFAULT 'Pending',
    row_count           INTEGER DEFAULT 0,
    error_message       TEXT,
    archived_file_path  VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_upload_status CHECK (status IN ('Pending','Processing','Completed','Failed','Archived'))
);

CREATE INDEX idx_dataset_uploads_county       ON dataset_uploads(county);
CREATE INDEX idx_dataset_uploads_uploaded_by  ON dataset_uploads(uploaded_by);
CREATE INDEX idx_dataset_uploads_status       ON dataset_uploads(status);
CREATE INDEX idx_dataset_uploads_upload_date  ON dataset_uploads(upload_date);

-- Dataset Records: Exact copy of every imported row, preserved as-is
CREATE TABLE dataset_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id           UUID NOT NULL REFERENCES dataset_uploads(id) ON DELETE CASCADE,
    row_number          INTEGER NOT NULL,
    
    -- Raw fields preserved exactly as imported (no normalization)
    national_id         VARCHAR(20),
    full_name           VARCHAR(255),
    gender              VARCHAR(10),
    phone_number        VARCHAR(20),
    county              VARCHAR(255),
    district            VARCHAR(255),
    division            VARCHAR(255),
    location            VARCHAR(255),
    sub_location        VARCHAR(255),
    village             VARCHAR(255),
    polling_station     VARCHAR(255),
    registration_status VARCHAR(50),
    registration_date   VARCHAR(50),
    
    -- Additional raw columns (flexible for different Excel structures)
    extra_data          JSONB,
    
    -- Tracking
    is_edited           BOOLEAN DEFAULT FALSE,
    edited_by           UUID REFERENCES users(id),
    edited_at           TIMESTAMPTZ,
    is_synced           BOOLEAN DEFAULT FALSE,
    synced_citizen_id   UUID REFERENCES citizens(id),
    sync_error          TEXT,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(upload_id, row_number)
);

CREATE INDEX idx_dataset_records_upload_id        ON dataset_records(upload_id);
CREATE INDEX idx_dataset_records_national_id      ON dataset_records(national_id);
CREATE INDEX idx_dataset_records_full_name        ON dataset_records(full_name);
CREATE INDEX idx_dataset_records_gender           ON dataset_records(gender);
CREATE INDEX idx_dataset_records_county           ON dataset_records(county);
CREATE INDEX idx_dataset_records_district         ON dataset_records(district);
CREATE INDEX idx_dataset_records_registration_status ON dataset_records(registration_status);
CREATE INDEX idx_dataset_records_is_edited        ON dataset_records(is_edited);
CREATE INDEX idx_dataset_records_is_synced        ON dataset_records(is_synced);

-- Dataset Validation Errors: Structured error reporting per row
CREATE TABLE dataset_validation_errors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id           UUID NOT NULL REFERENCES dataset_uploads(id) ON DELETE CASCADE,
    row_number          INTEGER NOT NULL,
    field_name          VARCHAR(255),
    error_message       TEXT NOT NULL,
    error_severity      VARCHAR(20) DEFAULT 'ERROR',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_severity CHECK (error_severity IN ('WARNING','ERROR','INFO'))
);

CREATE INDEX idx_validation_errors_upload_id     ON dataset_validation_errors(upload_id);
CREATE INDEX idx_validation_errors_row_number    ON dataset_validation_errors(row_number);

-- Dataset Column Metadata: Track which columns were present in each import
CREATE TABLE dataset_column_mappings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id           UUID NOT NULL REFERENCES dataset_uploads(id) ON DELETE CASCADE,
    source_column_name  VARCHAR(255) NOT NULL,
    target_field_name   VARCHAR(255) NOT NULL,
    column_index        INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(upload_id, source_column_name)
);

CREATE INDEX idx_column_mappings_upload_id  ON dataset_column_mappings(upload_id);
