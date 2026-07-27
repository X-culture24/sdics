import { getData } from './client';
import type {
  DistrictPerformanceRow,
  ID,
  KPISummary,
  PerformanceTableRow,
  RegistrationTrendPoint,
} from '@/types/dto';

export const dashboardApi = {
  kpis: (params?: { campaignId?: ID }) =>
    getData<KPISummary>('/dashboard/kpis', {
      campaign_id: params?.campaignId,
    }),

  districtPerformance: (params?: { campaignId?: ID }) =>
    getData<{ data: DistrictPerformanceRow[] }>('/dashboard/district-performance', {
      campaign_id: params?.campaignId,
    }),

  registrationTrend: (params?: { days?: number; campaignId?: ID }) =>
    getData<{ data: RegistrationTrendPoint[]; days: number }>(
      '/dashboard/registration-trend',
      { days: params?.days ?? 30, campaign_id: params?.campaignId },
    ),

  performanceTable: (params?: { level?: number; campaignId?: ID }) =>
    getData<{ data: PerformanceTableRow[]; level: number }>(
      '/dashboard/performance-table',
      { level: params?.level ?? 3, campaign_id: params?.campaignId },
    ),
};
