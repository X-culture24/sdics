export const ROLE_NAMES = {
  SYSADMIN: 'System Administrator',
  NATIONAL: 'National Administrator',
  COUNTY: 'County Administrator',
  DCC: 'Deputy County Commissioner',
  ACC: 'Assistant County Commissioner',
  CHIEF: 'Chief',
  CLERK: 'Data Clerk',
  VIEWER: 'Viewer',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export const ADMIN_LEVELS = {
  NATION: 1,
  COUNTY: 2,
  DISTRICT: 3,
  DIVISION: 4,
  LOCATION: 5,
  SUB_LOCATION: 6,
  VILLAGE: 7,
};

export const CITIZEN_REG_STATUSES: Array<{ value: string; label: string; color: string }> = [
  { value: 'Registered', label: 'Registered', color: 'success' },
  { value: 'Unregistered', label: 'Not Registered', color: 'warning' },
  { value: 'Pending', label: 'Pending', color: 'info' },
  { value: 'Ineligible', label: 'Ineligible', color: 'error' },
];

export const CAMPAIGN_STATUSES: Array<{ value: string; label: string; color: string }> = [
  { value: 'Draft', label: 'Draft', color: 'default' },
  { value: 'Active', label: 'Active', color: 'success' },
  { value: 'Paused', label: 'Paused', color: 'warning' },
  { value: 'Completed', label: 'Completed', color: 'info' },
  { value: 'Archived', label: 'Archived', color: 'default' },
];

export const DEFAULT_PAGE_SIZE = 25;
export const API_BASE = '/api/v1';

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'Dashboard', path: '/dashboard', roles: ['*'] },
  { key: 'citizens', label: 'Citizens', icon: 'PeopleAlt', path: '/citizens', roles: ['*'] },
  { key: 'campaigns', label: 'Campaigns', icon: 'Campaign', path: '/campaigns', roles: ['System Administrator', 'National Administrator', 'County Administrator', 'Deputy County Commissioner'] },
  { key: 'imports', label: 'Imports', icon: 'UploadFile', path: '/imports', roles: ['*'] },
  { key: 'reports', label: 'Reports', icon: 'Description', path: '/reports', roles: ['*'] },
  { key: 'audit', label: 'Audit Logs', icon: 'HistoryEdu', path: '/audit-logs', roles: ['System Administrator', 'National Administrator'] },
  { key: 'users', label: 'Users', icon: 'Group', path: '/users', roles: ['System Administrator', 'National Administrator', 'County Administrator'] },
  { key: 'settings', label: 'Settings', icon: 'Settings', path: '/settings', roles: ['*'] },
];

export const DEFAULT_PERMISSIONS = [
  'admin_units:read',
  'admin_units:write',
  'users:read',
  'users:write',
  'campaigns:read',
  'campaigns:write',
  'citizens:read',
  'citizens:write',
  'citizens:register',
];
