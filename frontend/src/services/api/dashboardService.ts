import apiClient from '@/api/axios';
import type { DashboardKPIs, DistrictPerformance, RegistrationTrend } from '@/types/api';

export const dashboardService = {
  getKPIs: async (campaignId?: string): Promise<DashboardKPIs> => {
    const { data } = await apiClient.get<DashboardKPIs>('/dashboard/kpis', {
      params: campaignId ? { campaign_id: campaignId } : {},
    });
    return data;
  },

  getDistrictPerformance: async (campaignId?: string): Promise<DistrictPerformance[]> => {
    const { data } = await apiClient.get<DistrictPerformance[]>('/dashboard/district-performance', {
      params: campaignId ? { campaign_id: campaignId } : {},
    });
    return data;
  },

  getRegistrationTrend: async (campaignId?: string, days: number = 30): Promise<RegistrationTrend[]> => {
    const { data } = await apiClient.get<RegistrationTrend[]>('/dashboard/registration-trend', {
      params: {
        ...(campaignId ? { campaign_id: campaignId } : {}),
        days,
      },
    });
    return data;
  },

  getPerformanceTable: async (campaignId?: string) => {
    const { data } = await apiClient.get('/dashboard/performance-table', {
      params: campaignId ? { campaign_id: campaignId } : {},
    });
    return data;
  },
};
