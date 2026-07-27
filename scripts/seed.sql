-- ============================================================
-- NVRCMS Seed Data
-- Run after migrations: psql -U sdic_agent -d sdic -f scripts/seed.sql
-- ============================================================

-- ── Roles ────────────────────────────────────────────────────
INSERT INTO roles (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'System Administrator',          'Full system access'),
  ('00000000-0000-0000-0000-000000000002', 'National Administrator',         'National-level data access'),
  ('00000000-0000-0000-0000-000000000003', 'County Commissioner',            'County-level access'),
  ('00000000-0000-0000-0000-000000000004', 'Deputy County Commissioner',     'County-level access (deputy)'),
  ('00000000-0000-0000-0000-000000000005', 'Assistant County Commissioner',  'County-level access (assistant)'),
  ('00000000-0000-0000-0000-000000000006', 'Chief',                          'Location-level data collection'),
  ('00000000-0000-0000-0000-000000000007', 'Assistant Chief',                'Location-level data collection (assistant)'),
  ('00000000-0000-0000-0000-000000000008', 'Data Entry Clerk',               'Data entry only'),
  ('00000000-0000-0000-0000-000000000009', 'Read Only Viewer',               'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- ── Permissions ──────────────────────────────────────────────
INSERT INTO permissions (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'citizens:read',        'View citizen records'),
  ('10000000-0000-0000-0000-000000000002', 'citizens:write',       'Create/update citizen records'),
  ('10000000-0000-0000-0000-000000000003', 'citizens:register',    'Confirm voter registration'),
  ('10000000-0000-0000-0000-000000000004', 'citizens:export',      'Export citizen data'),
  ('10000000-0000-0000-0000-000000000005', 'citizens:import',      'Import citizen data'),
  ('10000000-0000-0000-0000-000000000006', 'users:read',           'View users'),
  ('10000000-0000-0000-0000-000000000007', 'users:write',          'Create/update users'),
  ('10000000-0000-0000-0000-000000000008', 'campaigns:read',       'View campaigns'),
  ('10000000-0000-0000-0000-000000000009', 'campaigns:write',      'Create/update campaigns'),
  ('10000000-0000-0000-0000-000000000010', 'reports:read',         'View reports'),
  ('10000000-0000-0000-0000-000000000011', 'reports:generate',     'Generate reports'),
  ('10000000-0000-0000-0000-000000000012', 'audit:read',           'View audit logs'),
  ('10000000-0000-0000-0000-000000000013', 'admin_units:read',     'View administrative units'),
  ('10000000-0000-0000-0000-000000000014', 'admin_units:write',    'Manage administrative units'),
  ('10000000-0000-0000-0000-000000000015', 'dashboard:read',       'View dashboard'),
  ('10000000-0000-0000-0000-000000000016', 'analytics:read',       'View analytics'),
  ('10000000-0000-0000-0000-000000000017', 'notifications:read',   'View notifications'),
  ('10000000-0000-0000-0000-000000000018', 'settings:write',       'Manage system settings')
ON CONFLICT (name) DO NOTHING;

-- ── Role → Permission mappings ────────────────────────────────
-- System Administrator: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

-- National Administrator: all except settings and user management
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name NOT IN ('settings:write','admin_units:write')
ON CONFLICT DO NOTHING;

-- County Commissioner
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name IN ('citizens:read','citizens:write','citizens:register','citizens:export',
               'campaigns:read','reports:read','reports:generate','dashboard:read',
               'analytics:read','admin_units:read','notifications:read')
ON CONFLICT DO NOTHING;

-- Deputy County Commissioner: same as County Commissioner
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions
WHERE name IN ('citizens:read','citizens:write','citizens:register','citizens:export',
               'campaigns:read','reports:read','reports:generate','dashboard:read',
               'analytics:read','admin_units:read','notifications:read')
ON CONFLICT DO NOTHING;

-- Assistant County Commissioner
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM permissions
WHERE name IN ('citizens:read','citizens:write','citizens:register',
               'campaigns:read','reports:read','dashboard:read',
               'analytics:read','admin_units:read','notifications:read')
ON CONFLICT DO NOTHING;

-- Chief
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', id FROM permissions
WHERE name IN ('citizens:read','citizens:write','citizens:register',
               'campaigns:read','dashboard:read','notifications:read','admin_units:read')
ON CONFLICT DO NOTHING;

-- Assistant Chief: same as Chief
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000007', id FROM permissions
WHERE name IN ('citizens:read','citizens:write','citizens:register',
               'campaigns:read','dashboard:read','notifications:read','admin_units:read')
ON CONFLICT DO NOTHING;

-- Data Entry Clerk
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000008', id FROM permissions
WHERE name IN ('citizens:read','citizens:write','campaigns:read',
               'dashboard:read','notifications:read','admin_units:read')
ON CONFLICT DO NOTHING;

-- Read Only Viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000009', id FROM permissions
WHERE name IN ('citizens:read','campaigns:read','dashboard:read',
               'reports:read','analytics:read','admin_units:read','notifications:read')
ON CONFLICT DO NOTHING;

-- ── National Admin Unit ───────────────────────────────────────
INSERT INTO admin_units (id, name, level, parent_id, code) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Kenya', 1, NULL, 'KE')
ON CONFLICT (code) DO NOTHING;

-- ── Kenya Counties (47) ───────────────────────────────────────
INSERT INTO admin_units (name, level, parent_id, code) VALUES
  ('Mombasa',        2, '20000000-0000-0000-0000-000000000001', 'KE-001'),
  ('Kwale',          2, '20000000-0000-0000-0000-000000000001', 'KE-002'),
  ('Kilifi',         2, '20000000-0000-0000-0000-000000000001', 'KE-003'),
  ('Tana River',     2, '20000000-0000-0000-0000-000000000001', 'KE-004'),
  ('Lamu',           2, '20000000-0000-0000-0000-000000000001', 'KE-005'),
  ('Taita-Taveta',   2, '20000000-0000-0000-0000-000000000001', 'KE-006'),
  ('Garissa',        2, '20000000-0000-0000-0000-000000000001', 'KE-007'),
  ('Wajir',          2, '20000000-0000-0000-0000-000000000001', 'KE-008'),
  ('Mandera',        2, '20000000-0000-0000-0000-000000000001', 'KE-009'),
  ('Marsabit',       2, '20000000-0000-0000-0000-000000000001', 'KE-010'),
  ('Isiolo',         2, '20000000-0000-0000-0000-000000000001', 'KE-011'),
  ('Meru',           2, '20000000-0000-0000-0000-000000000001', 'KE-012'),
  ('Tharaka-Nithi',  2, '20000000-0000-0000-0000-000000000001', 'KE-013'),
  ('Embu',           2, '20000000-0000-0000-0000-000000000001', 'KE-014'),
  ('Kitui',          2, '20000000-0000-0000-0000-000000000001', 'KE-015'),
  ('Machakos',       2, '20000000-0000-0000-0000-000000000001', 'KE-016'),
  ('Makueni',        2, '20000000-0000-0000-0000-000000000001', 'KE-017'),
  ('Nyandarua',      2, '20000000-0000-0000-0000-000000000001', 'KE-018'),
  ('Nyeri',          2, '20000000-0000-0000-0000-000000000001', 'KE-019'),
  ('Kirinyaga',      2, '20000000-0000-0000-0000-000000000001', 'KE-020'),
  ('Murang''a',      2, '20000000-0000-0000-0000-000000000001', 'KE-021'),
  ('Kiambu',         2, '20000000-0000-0000-0000-000000000001', 'KE-022'),
  ('Turkana',        2, '20000000-0000-0000-0000-000000000001', 'KE-023'),
  ('West Pokot',     2, '20000000-0000-0000-0000-000000000001', 'KE-024'),
  ('Samburu',        2, '20000000-0000-0000-0000-000000000001', 'KE-025'),
  ('Trans Nzoia',    2, '20000000-0000-0000-0000-000000000001', 'KE-026'),
  ('Uasin Gishu',    2, '20000000-0000-0000-0000-000000000001', 'KE-027'),
  ('Elgeyo-Marakwet',2, '20000000-0000-0000-0000-000000000001', 'KE-028'),
  ('Nandi',          2, '20000000-0000-0000-0000-000000000001', 'KE-029'),
  ('Baringo',        2, '20000000-0000-0000-0000-000000000001', 'KE-030'),
  ('Laikipia',       2, '20000000-0000-0000-0000-000000000001', 'KE-031'),
  ('Nakuru',         2, '20000000-0000-0000-0000-000000000001', 'KE-032'),
  ('Narok',          2, '20000000-0000-0000-0000-000000000001', 'KE-033'),
  ('Kajiado',        2, '20000000-0000-0000-0000-000000000001', 'KE-034'),
  ('Kericho',        2, '20000000-0000-0000-0000-000000000001', 'KE-035'),
  ('Bomet',          2, '20000000-0000-0000-0000-000000000001', 'KE-036'),
  ('Kakamega',       2, '20000000-0000-0000-0000-000000000001', 'KE-037'),
  ('Vihiga',         2, '20000000-0000-0000-0000-000000000001', 'KE-038'),
  ('Bungoma',        2, '20000000-0000-0000-0000-000000000001', 'KE-039'),
  ('Busia',          2, '20000000-0000-0000-0000-000000000001', 'KE-040'),
  ('Siaya',          2, '20000000-0000-0000-0000-000000000001', 'KE-041'),
  ('Kisumu',         2, '20000000-0000-0000-0000-000000000001', 'KE-042'),
  ('Homa Bay',       2, '20000000-0000-0000-0000-000000000001', 'KE-043'),
  ('Migori',         2, '20000000-0000-0000-0000-000000000001', 'KE-044'),
  ('Kisii',          2, '20000000-0000-0000-0000-000000000001', 'KE-045'),
  ('Nyamira',        2, '20000000-0000-0000-0000-000000000001', 'KE-046'),
  ('Nairobi',        2, '20000000-0000-0000-0000-000000000001', 'KE-047')
ON CONFLICT (code) DO NOTHING;

-- ── Default System Administrator account ─────────────────────
-- Password: Admin@123456  (bcrypt hash — CHANGE ON FIRST LOGIN)
INSERT INTO users (id, full_name, email, password_hash, role_id, admin_unit_id) VALUES (
  '30000000-0000-0000-0000-000000000001',
  'System Administrator',
  'admin@sdics.tech',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCZy2/sDSwMx5iBpXGGkloq',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
) ON CONFLICT (email) DO NOTHING;

-- ── Default system settings ───────────────────────────────────
INSERT INTO settings (key, value, description) VALUES
  ('campaign_working_days', 'Mon,Tue,Wed,Thu,Fri', 'Working days for target calculation'),
  ('max_login_attempts',    '5',                   'Max failed logins before lockout'),
  ('lockout_minutes',       '15',                  'Lockout duration in minutes'),
  ('session_timeout_mins',  '30',                  'Idle session timeout in minutes')
ON CONFLICT (key) DO NOTHING;
