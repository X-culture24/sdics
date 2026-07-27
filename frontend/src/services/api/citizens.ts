import { getData, postData, putData, deleteData, patchData } from './client';
import type {
  Citizen,
  CitizenStats,
  ID,
  PaginationResponse,
  QueryParams,
  RegistrationRecord,
} from '@/types/dto';

export const citizensApi = {
  list: (params?: QueryParams) =>
    getData<PaginationResponse<Citizen>>('/citizens', params),

  get: (id: ID) => getData<Citizen>(`/citizens/${id}`),

  getByNationalID: (nid: string) =>
    getData<Citizen>(`/citizens/nid/${encodeURIComponent(nid)}`),

  stats: (params?: { [k: string]: any }) =>
    getData<CitizenStats>('/citizens/stats', params),

  create: (body: Partial<Citizen> & { fullName: string; nationalId: string }) =>
    postData<Partial<Citizen>, Citizen>('/citizens', body),

  update: (id: ID, body: Partial<Citizen>) =>
    putData<Partial<Citizen>, Citizen>(`/citizens/${id}`, body),

  delete: (id: ID) => deleteData(`/citizens/${id}`),

  register: (id: ID, body: { campaignId: ID; source?: string }) =>
    postData<{ campaignId: ID; source?: string }, RegistrationRecord>(
      `/citizens/${id}/register`,
      body,
    ),

  unregister: (id: ID, body: { campaignId: ID }) =>
    patchData<{ campaignId: ID }, Citizen>(`/citizens/${id}/unregister`, body),
};
