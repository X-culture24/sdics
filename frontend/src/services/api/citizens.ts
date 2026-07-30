import client from './client';
import { Citizen } from '../../types/api';

export const citizensApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    countyId?: string;
    districtId?: string;
    status?: string;
  }) => client.get<{ data: Citizen[]; total: number }>('/citizens', { params }),

  getById: (id: string) =>
    client.get<Citizen>(`/citizens/${id}`),

  getByNationalId: (nid: string) =>
    client.get<Citizen>(`/citizens/nid/${nid}`),

  create: (data: Partial<Citizen>) =>
    client.post<Citizen>('/citizens', data),

  update: (id: string, data: Partial<Citizen>) =>
    client.put<Citizen>(`/citizens/${id}`, data),

  delete: (id: string) =>
    client.delete(`/citizens/${id}`),

  register: (id: string, data: { campaignId?: string }) =>
    client.post(`/citizens/${id}/register`, data),

  getStats: () =>
    client.get('/citizens/stats'),
};
