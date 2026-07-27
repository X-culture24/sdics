import { getData, postData, putData } from './client';
import type { AuditLog, ID, PaginationResponse, Setting } from '@/types/dto';

export const settingsApi = {
  list: () => getData<{ data: Setting[] }>('/settings'),
  update: (key: string, value: string) =>
    putData<{ key: string; value: string }, Setting>('/settings', { key, value }),
};

export const auditLogsApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    actorId?: ID;
    action?: string;
    entityType?: string;
    entityId?: ID;
  }) =>
    getData<PaginationResponse<AuditLog>>('/audit-logs', params),

  get: (id: ID) => getData<AuditLog>(`/audit-logs/${id}`),

  log: (data: { action: string; entityType: string; entityId?: ID; details?: any }) =>
    postData<typeof data, { message: string }>('/audit-logs', data),
};
