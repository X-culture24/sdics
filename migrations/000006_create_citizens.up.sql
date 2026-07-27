CREATE TABLE citizens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    national_id         VARCHAR(20) UNIQUE NOT NULL,
    full_name           VARCHAR(255) NOT NULL,
    gender              VARCHAR(10) NOT NULL,
    phone_number        VARCHAR(20),
    county_id           UUID NOT NULL REFERENCES admin_units(id),
    district_id         UUID NOT NULL REFERENCES admin_units(id),
    division_id         UUID REFERENCES admin_units(id),
    location_id         UUID REFERENCES admin_units(id),
    sub_location_id     UUID REFERENCES admin_units(id),
    village_id          UUID REFERENCES admin_units(id),
    polling_station     VARCHAR(255),
    registration_status VARCHAR(20) NOT NULL DEFAULT 'Unregistered',
    registration_date   TIMESTAMPTZ,
    updated_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_gender CHECK (gender IN ('Male','Female','Other')),
    CONSTRAINT chk_reg_status CHECK (registration_status IN ('Unregistered','Registered'))
);

CREATE INDEX idx_citizens_national_id         ON citizens(national_id);
CREATE INDEX idx_citizens_full_name            ON citizens(full_name);
CREATE INDEX idx_citizens_phone_number         ON citizens(phone_number);
CREATE INDEX idx_citizens_registration_status  ON citizens(registration_status);
CREATE INDEX idx_citizens_county_id            ON citizens(county_id);
CREATE INDEX idx_citizens_district_id          ON citizens(district_id);
CREATE INDEX idx_citizens_division_id          ON citizens(division_id);
CREATE INDEX idx_citizens_location_id          ON citizens(location_id);
CREATE INDEX idx_citizens_sub_location_id      ON citizens(sub_location_id);
CREATE INDEX idx_citizens_registration_date    ON citizens(registration_date);
