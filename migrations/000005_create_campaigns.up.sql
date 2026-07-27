CREATE TABLE campaigns (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'Draft',
    initial_nid_count INTEGER NOT NULL DEFAULT 0,
    created_by        UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_campaign_status CHECK (status IN ('Draft','Active','Completed')),
    CONSTRAINT chk_campaign_dates  CHECK (end_date >= start_date)
);

CREATE TABLE campaign_public_holidays (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    description  VARCHAR(255),
    UNIQUE (campaign_id, holiday_date)
);
