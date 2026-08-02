import apiClient from '@/api/axios';
import type { Campaign, ListResponse } from '@/types/api';

// Helper to convert snake_case campaign to camelCase
const convertCampaign = (data: any): Campaign => ({
  id: data.id,
  name: data.name,
  description: data.description,
  startDate: data.start_date ?? data.startDate,
  endDate: data.end_date ?? data.endDate,
  status: data.status,
  initial_nid_count: data.initial_nid_count ?? data.initial_nid_count ?? 0,
  created_by: data.created_by,
  createdAt: data.created_at ?? data.createdAt,
  updatedAt: data.updated_at ?? data.updatedAt,
});

export const campaignService = {
  list: async (page = 1, pageSize = 20, status?: string): Promise<ListResponse<Campaign>> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    if (status) {
      params.append('status', status);
    }

    const { data } = await apiClient.get<any>(`/campaigns?${params}`);

    const campaignList = data?.data || data || [];
    const convertedCampaigns = Array.isArray(campaignList) ? campaignList.map(convertCampaign) : [];

    return {
      data: convertedCampaigns,
      total: data?.total || 0,
      page: data?.page || 1,
      pageSize: data?.page_size || pageSize,
    };
  },

  getById: async (id: string): Promise<Campaign> => {
    const { data } = await apiClient.get<any>(`/campaigns/${id}`);
    return convertCampaign(data);
  },

  create: async (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> => {
    // Convert camelCase to snake_case for API
    const payload = {
      name: campaign.name,
      description: campaign.description,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      initial_nid_count: campaign.initial_nid_count || 0,
    };
    const { data } = await apiClient.post<any>('/campaigns', payload);
    return convertCampaign(data);
  },

  update: async (id: string, campaign: Partial<Campaign>): Promise<Campaign> => {
    // Convert camelCase to snake_case for API
    const payload: any = {};
    if (campaign.name !== undefined) payload.name = campaign.name;
    if (campaign.description !== undefined) payload.description = campaign.description;
    if (campaign.startDate !== undefined) payload.start_date = campaign.startDate;
    if (campaign.endDate !== undefined) payload.end_date = campaign.endDate;
    if (campaign.initial_nid_count !== undefined) payload.initial_nid_count = campaign.initial_nid_count;
    
    const { data } = await apiClient.put<any>(`/campaigns/${id}`, payload);
    return convertCampaign(data);
  },

  changeStatus: async (id: string, status: string): Promise<Campaign> => {
    const { data } = await apiClient.patch<any>(`/campaigns/${id}/status`, { status });
    return convertCampaign(data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/campaigns/${id}`);
  },
};
