CREATE TABLE import_jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename         VARCHAR(500) NOT NULL,
    uploader_id      UUID NOT NULL REFERENCES users(id),
    campaign_id      UUID REFERENCES campaigns(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'Pending',
    total_rows       INTEGER NOT NULL DEFAULT 0,
    inserted_rows    INTEGER NOT NULL DEFAULT 0,
    rejected_rows    INTEGER NOT NULL DEFAULT 0,
    error_report_url VARCHAR(500),
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_import_status CHECK (status IN ('Pending','Processing','Completed','Failed'))
);
