/**
 * Constants - Enums, roles, statuses, and configuration values
 */

export const ROLES = {
    SYSTEM_ADMIN: 'System Administrator',
    NATIONAL_ADMIN: 'National Administrator',
    COUNTY_COMMISSIONER: 'County Commissioner',
    DEPUTY_COUNTY_COMMISSIONER: 'Deputy County Commissioner',
    ASSISTANT_COUNTY_COMMISSIONER: 'Assistant County Commissioner',
    CHIEF: 'Chief',
    ASSISTANT_CHIEF: 'Assistant Chief',
    DATA_ENTRY_CLERK: 'Data Entry Clerk',
    READ_ONLY_VIEWER: 'Read Only Viewer'
};

export const ADMIN_UNIT_LEVELS = {
    0: 'National',
    1: 'County',
    2: 'Sub County',
    3: 'District',
    4: 'Division',
    5: 'Location',
    6: 'Sub Location',
    7: 'Village'
};

export const CITIZEN_REGISTRATION_STATUS = {
    UNREGISTERED: 'Unregistered',
    REGISTERED: 'Registered'
};

export const CAMPAIGN_STATUS = {
    DRAFT: 'Draft',
    ACTIVE: 'Active',
    COMPLETED: 'Completed'
};

export const IMPORT_JOB_STATUS = {
    PENDING: 'Pending',
    RUNNING: 'Running',
    COMPLETED: 'Completed',
    FAILED: 'Failed'
};

export const PERFORMANCE_STATUS = {
    CRITICAL: 'Critical',
    BELOW_TARGET: 'Below Target',
    ON_TRACK: 'On Track',
    EXCEEDING: 'Exceeding'
};

export const PERFORMANCE_COLORS = {
    CRITICAL: '#8B0000',      // Dark Red (0-24%)
    BELOW_TARGET: '#DC3545',  // Red (25-49%)
    WARNING: '#F9A825',       // Amber (50-79%)
    SUCCESS: '#0066CC'        // Government Blue (80-100%)
};

export const PERFORMANCE_THRESHOLDS = {
    CRITICAL: 0.25,  // Below 25%
    BELOW_TARGET: 0.50,  // 25-50%
    WARNING: 0.80,  // 50-80%
    SUCCESS: 1.0   // 80%+
};

export const GENDER_OPTIONS = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other'
};

export const API_ERRORS = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SESSION_EXPIRED: 'SESSION_EXPIRED'
};

export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

export const API_BASE_URL = window.API_BASE_URL || `${window.location.protocol}//${window.location.host}/api/v1`;
export const WS_URL = window.WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

// Pagination defaults
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 200,
    TABLE_PAGE_SIZE: 50
};

// Timeouts and intervals
export const TIMEOUTS = {
    API_REQUEST: 30000,  // 30 seconds
    SESSION_WARNING: 600000,  // 10 minutes
    SESSION_TIMEOUT: 1800000,  // 30 minutes
    DASHBOARD_REFRESH: 5000,  // 5 seconds
    KPI_ANIMATION: 500  // 500ms
};

// Form validation rules
export const VALIDATION_RULES = {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^[\d+\-\s()]+$/,
    NID_MIN_LENGTH: 5,
    PASSWORD_MIN_LENGTH: 12,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100
};

export const PERMISSIONS = {
    // User management
    USERS_VIEW: 'users:view',
    USERS_CREATE: 'users:create',
    USERS_EDIT: 'users:edit',
    USERS_DELETE: 'users:delete',
    
    // Citizen management
    CITIZENS_VIEW: 'citizens:view',
    CITIZENS_CREATE: 'citizens:create',
    CITIZENS_EDIT: 'citizens:edit',
    CITIZENS_DELETE: 'citizens:delete',
    CITIZENS_REGISTER: 'citizens:register',
    CITIZENS_EXPORT: 'citizens:export',
    CITIZENS_IMPORT: 'citizens:import',
    
    // Campaign management
    CAMPAIGNS_VIEW: 'campaigns:view',
    CAMPAIGNS_CREATE: 'campaigns:create',
    CAMPAIGNS_EDIT: 'campaigns:edit',
    CAMPAIGNS_DELETE: 'campaigns:delete',
    
    // Reporting
    REPORTS_VIEW: 'reports:view',
    REPORTS_EXPORT: 'reports:export',
    
    // Admin
    ADMIN_UNITS_VIEW: 'admin_units:view',
    ADMIN_UNITS_CREATE: 'admin_units:create',
    ADMIN_UNITS_EDIT: 'admin_units:edit',
    ADMIN_UNITS_DELETE: 'admin_units:delete',
    
    // Audit
    AUDIT_VIEW: 'audit:view'
};

// Report types
export const REPORT_TYPES = {
    EXECUTIVE_SUMMARY: 'Executive Summary',
    DISTRICT_PERFORMANCE: 'District Performance',
    DAILY_PERFORMANCE: 'Daily Performance',
    CAMPAIGN_PERFORMANCE: 'Campaign Performance',
    REGISTRATION_FORECAST: 'Registration Forecast',
    OFFICER_PERFORMANCE: 'Officer Performance'
};

export const EXPORT_FORMATS = {
    PDF: 'pdf',
    EXCEL: 'excel',
    CSV: 'csv',
    HTML: 'html'
};
