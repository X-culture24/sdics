CREATE TABLE registration_records (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id    UUID NOT NULL REFERENCES citizens(id),
    campaign_id   UUID NOT NULL REFERENCES campaigns(id),
    registered_by UUID NOT NULL REFERENCES users(id),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source        VARCHAR(20) NOT NULL DEFAULT 'Manual',
    CONSTRAINT chk_source CHECK (source IN ('Manual','Import','Form','OfflineSync'))
);

CREATE INDEX idx_reg_records_campaign_id   ON registration_records(campaign_id);
CREATE INDEX idx_reg_records_registered_at ON registration_records(registered_at);
CREATE INDEX idx_reg_records_registered_by ON registration_records(registered_by);
