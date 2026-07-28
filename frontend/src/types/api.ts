// Auth
export interface User {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  adminUnitId: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  role?: Role;
  adminUnit?: AdminUnit;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

// Admin Units
export interface AdminUnit {
  id: string;
  name: string;
  level: number;
  code: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  parent?: AdminUnit;
  children?: AdminUnit[];
}

// Citizens
export interface Citizen {
  id: string;
  nationalId: string;
  fullName: string;
  gender: string;
  phoneNumber?: string;
  countyId: string;
  districtId: string;
  divisionId?: string;
  locationId?: string;
  subLocationId?: string;
  villageId?: string;
  pollingStation?: string;
  registrationStatus: 'Unregistered' | 'Registered' | 'Rejected';
  registrationDate?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  county?: AdminUnit;
  district?: AdminUnit;
}

export interface RegistrationRecord {
  id: string;
  citizenId: string;
  campaignId: string;
  registeredBy: string;
  registeredAt: string;
  source: string;
}

// Campaigns
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  initialNidCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTarget {
  id: string;
  campaignId: string;
  adminUnitId: string;
  targetDate: string;
  targetCount: number;
  computedAt: string;
}

export interface DailyProgress {
  id: string;
  campaignId: string;
  adminUnitId: string;
  progressDate: string;
  registeredCount: number;
  updatedAt: string;
}

// Dashboard
export interface DashboardKPIs {
  initialNidCount: number;
  registeredCount: number;
  todayTarget: number;
  todayProgress: number;
  overallProgress: number;
  campaignDaysRemaining: number;
  lastSyncTime: string;
}

export interface DistrictPerformance {
  districtId: string;
  districtName: string;
  registeredCount: number;
  targetCount: number;
  completionPercent: number;
}

export interface RegistrationTrend {
  date: string;
  count: number;
}

// Imports
export interface ImportJob {
  id: string;
  filename: string;
  uploaderId: string;
  campaignId?: string;
  status: string;
  totalRows: number;
  insertedRows: number;
  rejectedRows: number;
  errorReportUrl?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// Audit
export interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Notifications
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  scopeUnitId?: string;
  isRead: boolean;
  recipientId?: string;
  createdAt: string;
}

// API Response types
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
