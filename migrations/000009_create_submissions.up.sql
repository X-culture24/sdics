CREATE TABLE data_collection_submissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    national_id         VARCHAR(20) NOT NULL,
    citizen_name        VARCHAR(255) NOT NULL,
    phone_number        VARCHAR(20),
    gender              VARCHAR(10) NOT NULL,
    county_id           UUID NOT NULL REFERENCES admin_units(id),
    sub_county_id       UUID REFERENCES admin_units(id),
    district_id         UUID REFERENCES admin_units(id),
    division_id         UUID REFERENCES admin_units(id),
    location_id         UUID REFERENCES admin_units(id),
    sub_location_id     UUID REFERENCES admin_units(id),
    village_id          UUID REFERENCES admin_units(id),
    polling_station     VARCHAR(255),
    registration_status VARCHAR(20) NOT NULL,
    registration_date   DATE,
    officer_name        VARCHAR(255),
    remarks             TEXT,
    gps_latitude        DECIMAL(10,8),
    gps_longitude       DECIMAL(11,8),
    photo_url           VARCHAR(500),
    submission_date     DATE NOT NULL,
    submission_time     TIME NOT NULL,
    submitted_by        UUID NOT NULL REFERENCES users(id),
    sync_status         VARCHAR(20) NOT NULL DEFAULT 'Pending',
    synced_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sync_status CHECK (sync_status IN ('Pending','Synced','Failed'))
);

CREATE INDEX idx_submissions_national_id     ON data_collection_submissions(national_id);
CREATE INDEX idx_submissions_submission_date ON data_collection_submissions(submission_date);
CREATE INDEX idx_submissions_submitted_by    ON data_collection_submissions(submitted_by);
-- Enforce one submission per NID per day
CREATE UNIQUE INDEX idx_submissions_nid_date ON data_collection_submissions(national_id, submission_date);
