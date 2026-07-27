CREATE TABLE daily_targets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id   UUID NOT NULL REFERENCES campaigns(id),
    admin_unit_id UUID NOT NULL REFERENCES admin_units(id),
    target_date   DATE NOT NULL,
    target_count  INTEGER NOT NULL DEFAULT 0,
    computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, admin_unit_id, target_date)
);

CREATE TABLE daily_progress (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID NOT NULL REFERENCES campaigns(id),
    admin_unit_id    UUID NOT NULL REFERENCES admin_units(id),
    progress_date    DATE NOT NULL,
    registered_count INTEGER NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, admin_unit_id, progress_date)
);
