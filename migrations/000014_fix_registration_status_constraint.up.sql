-- Fix registration_status constraint to include Pending and Ineligible statuses
ALTER TABLE citizens DROP CONSTRAINT chk_reg_status;
ALTER TABLE citizens ADD CONSTRAINT chk_reg_status CHECK (registration_status IN ('Unregistered','Registered','Pending','Ineligible'));
