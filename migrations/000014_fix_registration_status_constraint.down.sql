-- Revert registration_status constraint
ALTER TABLE citizens DROP CONSTRAINT chk_reg_status;
ALTER TABLE citizens ADD CONSTRAINT chk_reg_status CHECK (registration_status IN ('Unregistered','Registered'));
