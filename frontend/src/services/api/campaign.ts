import { getData, postData, putData, patchData, deleteData } from './client';
import type {
  Campaign,
  CampaignStats,
  ID,
  PaginationResponse,
  QueryParams,
} from '@/types/dto';

export const campaignsApi = {
  list: (params?: QueryParams) =>
    getData<PaginationResponse<Campaign>>('/campaigns', params),

  get: (id: ID) => getData<Campaign>(`/campaigns/${id}`),

  create: (
    body: Partial<Campaign> & { name: string; startDate: string; endDate: string },
  ) => postData<Partial<Campaign>, Campaign>('/campaigns', body),

  update: (id: ID, body: Partial<Campaign>) =>
    putData<Partial<Campaign>, Campaign>(`/campaigns/${id}`, body),

  changeStatus: (id: ID, status: Campaign['status']) =>
    patchData<{ status: Campaign['status'] }, Campaign>(`/campaigns/${id}/status`, {
      status,
    }),

  delete: (id: ID) => deleteData(`/campaigns/${id}`),

  stats: (id: ID) => getData<CampaignStats>(`/campaigns/${id}/stats`),
};
