import apiClient from '@/api/axios';
import type { Citizen, RegistrationRecord, ListResponse } from '@/types/api';

export interface CitizenListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  districtId?: string;
}

export const citizenService = {
  list: async (params: CitizenListParams = {}): Promise<ListResponse<Citizen>> => {
    const { data } = await apiClient.get<ListResponse<Citizen>>('/citizens', { params });
    return data;
  },

  getById: async (id: string): Promise<Citizen> => {
    const { data } = await apiClient.get<Citizen>(`/citizens/${id}`);
    return data;
  },

  getByNationalId: async (nationalId: string): Promise<Citizen> => {
    const { data } = await apiClient.get<Citizen>(`/citizens/nid/${nationalId}`);
    return data;
  },

  register: async (id: string): Promise<RegistrationRecord> => {
    const { data } = await apiClient.post<RegistrationRecord>(`/citizens/${id}/register`, {});
    return data;
  },

  create: async (citizen: Partial<Citizen>): Promise<Citizen> => {
    const { data } = await apiClient.post<Citizen>('/citizens', citizen);
    return data;
  },

  update: async (id: string, citizen: Partial<Citizen>): Promise<Citizen> => {
    const { data } = await apiClient.put<Citizen>(`/citizens/${id}`, citizen);
    return data;
  },
};
