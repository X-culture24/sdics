export interface UUID {
  toString(): string;
}
export type ID = string & { __brand?: 'uuid' };

export interface Role {
  id: ID;
  name: string;
  description?: string | null;
  createdAt: string;
}

export interface User {
  id: ID;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roleId: ID;
  role?: Role | null;
  adminUnitId?: ID | null;
  adminUnit?: AdminUnit | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUnit {
  id: ID;
  name: string;
  code?: string | null;
  level: number;
  parentId?: ID | null;
  parent?: AdminUnit | null;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus =
  | 'Draft'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Archived';

export interface Campaign {
  id: ID;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  initialNIDCount: number;
  status: CampaignStatus;
  createdById: ID;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  totalRegistered: number;
  remainingIDs: number;
  completionPercent: number;
}

export type Gender = 'Male' | 'Female';
export type RegStatus = 'Registered' | 'Unregistered' | 'Pending' | 'Ineligible';

export interface Citizen {
  id: ID;
  nationalId: string;
  fullName: string;
  gender: Gender;
  dob?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  countyId?: ID | null;
  county?: AdminUnit | null;
  districtId?: ID | null;
  district?: AdminUnit | null;
  divisionId?: ID | null;
  division?: AdminUnit | null;
  locationId?: ID | null;
  location?: AdminUnit | null;
  subLocationId?: ID | null;
  subLocation?: AdminUnit | null;
  villageId?: ID | null;
  village?: AdminUnit | null;
  pollingStation?: string | null;
  registrationStatus: RegStatus;
  registrationDate?: string | null;
  updatedBy?: ID | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationRecord {
  id: ID;
  citizenId: ID;
  campaignId: ID;
  registeredBy: ID;
  registeredAt: string;
  source: string;
  remarks?: string | null;
  citizen?: Citizen | null;
}

export interface DailyProgress {
  id: ID;
  campaignId: ID;
  adminUnitId: ID;
  progressDate: string;
  registeredCount: number;
  targetCount: number;
  updatedAt: string;
}

export interface ImportJob {
  id: ID;
  filename: string;
  uploaderId: ID;
  campaignId?: ID | null;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  totalRows?: number | null;
  insertedRows?: number | null;
  rejectedRows?: number | null;
  errorReportURL?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: ID;
  actorId?: ID | null;
  action: string;
  entityType: string;
  entityId?: ID | null;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface Notification {
  id: ID;
  userId: ID;
  title: string;
  message: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface Setting {
  id: ID;
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
}

export interface CitizenStats {
  total: number;
  registered: number;
  unregistered: number;
  pending: number;
  ineligible: number;
  male: number;
  female: number;
}

export interface KPISummary {
  nationalIdsNotRegistered: number;
  registeredVoters: number;
  adultPopulation: number;
  initialTarget: number;
  todaysTarget: number;
  todaysProgress: number;
  overallProgressPercent: number;
  remainingWorkingDays: number;
  totalWorkingDays: number;
  activeCampaignId?: ID | null;
  activeCampaignName?: string | null;
}

export interface DistrictPerformanceRow {
  id: ID;
  name: string;
  countyName?: string | null;
  adultPopulation: number;
  registered: number;
  remaining: number;
  progressPercent: number;
}

export interface RegistrationTrendPoint {
  date: string;
  registered: number;
}

export interface PerformanceTableRow {
  id: ID;
  level: number;
  name: string;
  parentName?: string | null;
  adultPopulation: number;
  registered: number;
  remaining: number;
  progressPercent: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
  permissions: string[];
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  [k: string]: any;
}

export type ReportFormat = 'csv' | 'xlsx';
