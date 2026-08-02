import apiClient from '@/api/axios';
import type { DashboardKPIs, DistrictPerformance, RegistrationTrend } from '@/types/api';

// Helper to convert snake_case response to camelCase
const convertKPIs = (data: any): DashboardKPIs => ({
  initialNidCount: data.initial_nid_count ?? data.initialNidCount ?? 0,
  registeredCount: data.registered_voters ?? data.registeredCount ?? 0,
  todayTarget: data.todays_target ?? data.todayTarget ?? 0,
  todayProgress: data.todays_progress ?? data.todayProgress ?? 0,
  overallProgress: data.overall_progress_percent ?? data.overallProgress ?? 0,
  campaignDaysRemaining: data.remaining_working_days ?? data.campaignDaysRemaining ?? 0,
  lastSyncTime: new Date().toISOString(),
  datasetTotal: data.dataset_total ?? 0,
  datasetRegistered: data.dataset_registered ?? 0,
  datasetUnregistered: data.dataset_unregistered ?? 0,
});

const convertDistrictPerformance = (data: any[]): DistrictPerformance[] => {
  if (!Array.isArray(data)) return [];
  return data.map(d => ({
    districtId: d.district_id ?? d.districtId ?? '',
    districtName: d.district_name ?? d.districtName ?? '',
    registeredCount: d.registered_count ?? d.registeredCount ?? 0,
    targetCount: d.target_count ?? d.targetCount ?? 0,
    completionPercent: d.completion_percent ?? d.completionPercent ?? 0,
  }));
};

const convertRegistrationTrend = (data: any[]): RegistrationTrend[] => {
  if (!Array.isArray(data)) return [];
  return data.map(d => ({
    date: d.date ?? '',
    count: d.count ?? d.registered_count ?? 0,
  }));
};

export const dashboardService = {
  getKPIs: async (campaignId?: string): Promise<DashboardKPIs> => {
    const { data } = await apiClient.get('/dashboard/kpis', {
      params: campaignId ? { campaign_id: campaignId } : {},
    });
    return convertKPIs(data);
  },

  getDistrictPerformance: async (campaignId?: string): Promise<DistrictPerformance[]> => {
    const { data } = await apiClient.get<any>('/dashboard/district-performance', {
      params: campaignId ? { campaign_id: campaignId } : {},
    });
    const performanceData = data?.data || data || [];
    return convertDistrictPerformance(Array.isArray(performanceData) ? performanceData : []);
  },

  getRegistrationTrend: async (campaignId?: string, days: number = 30): Promise<RegistrationTrend[]> => {
    const { data } = await apiClient.get<any>('/dashboard/registration-trend', {
      params: {
        ...(campaignId ? { campaign_id: campaignId } : {}),
        days,
      },
    });
    const trendData = data?.data || data || [];
    return convertRegistrationTrend(Array.isArray(trendData) ? trendData : []);
  },

  getPerformanceTable: async (campaignId?: string) => {
    const { data } = await apiClient.get<any>('/dashboard/performance-table', {
      params: campaignId ? { campaign_id: campaignId } : {},
    });
    const tableData = data?.data || data || [];
    return Array.isArray(tableData) ? tableData : [];
  },
};
