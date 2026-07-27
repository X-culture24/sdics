CREATE TABLE admin_units (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    level      SMALLINT NOT NULL,
    parent_id  UUID REFERENCES admin_units(id) ON DELETE RESTRICT,
    code       VARCHAR(50) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_level CHECK (level BETWEEN 1 AND 8)
);

CREATE INDEX idx_admin_units_parent_id ON admin_units(parent_id);
CREATE INDEX idx_admin_units_level     ON admin_units(level);
