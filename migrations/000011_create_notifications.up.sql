CREATE TABLE notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          VARCHAR(50) NOT NULL,
    title         VARCHAR(255) NOT NULL,
    body          TEXT NOT NULL,
    scope_unit_id UUID REFERENCES admin_units(id),
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_id  UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_created_at   ON notifications(created_at);
