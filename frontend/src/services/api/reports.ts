import { getData } from './client';
import { downloadBlob } from '@/utils/format';
import type { ID, ReportFormat } from '@/types/dto';

export const reportsApi = {
  exportCitizens: async (params: {
    format?: ReportFormat;
    countyId?: ID;
    districtId?: ID;
    divisionId?: ID;
    locationId?: ID;
    registrationStatus?: string;
  } & Record<string, any>) => {
    const format = params.format ?? 'csv';
    const { format: _f, ...rest } = params;
    const qs = new URLSearchParams();
    qs.set('format', format);
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        qs.set(k, String(v));
      }
    });
    const url = `/reports/citizens?${qs.toString()}`;
    const res = await fetch(
      `/api/v1${url}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('nvrcms:access') ?? ''}`,
        },
      },
    );
    if (!res.ok) throw new Error('Report download failed');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const nameMatch = /filename=(.+)/.exec(disposition);
    const filename = nameMatch?.[1] ?? `citizens_report.${format}`;
    downloadBlob(blob, filename);
    return filename;
  },

  performanceReport: async (params: { format?: ReportFormat; level?: number }) => {
    const format = params.format ?? 'csv';
    const url = `/reports/performance?format=${format}&level=${params.level ?? 3}`;
    const res = await fetch(`/api/v1${url}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('nvrcms:access') ?? ''}`,
      },
    });
    if (!res.ok) throw new Error('Report download failed');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const nameMatch = /filename=(.+)/.exec(disposition);
    const filename = nameMatch?.[1] ?? `performance_report.${format}`;
    downloadBlob(blob, filename);
    return filename;
  },

  campaignReport: async (campaignId: ID, format: ReportFormat = 'csv') => {
    const url = `/reports/campaigns/${campaignId}?format=${format}`;
    const res = await fetch(`/api/v1${url}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('nvrcms:access') ?? ''}`,
      },
    });
    if (!res.ok) throw new Error('Report download failed');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const nameMatch = /filename=(.+)/.exec(disposition);
    const filename = nameMatch?.[1] ?? `campaign_${campaignId}.${format}`;
    downloadBlob(blob, filename);
    return filename;
  },

  listCitizens: (params?: any) => getData<any>('/citizens', params),
};
