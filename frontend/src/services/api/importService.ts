import apiClient from '@/api/axios';
import type { ImportJob } from '@/types/api';

export const importService = {
  uploadFile: async (file: File, campaignId?: string): Promise<ImportJob> => {
    const formData = new FormData();
    formData.append('file', file);
    if (campaignId) {
      formData.append('campaign_id', campaignId);
    }

    const { data } = await apiClient.post<ImportJob>('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  listJobs: async (page: number = 1, pageSize: number = 10) => {
    const { data } = await apiClient.get('/imports/jobs', {
      params: { page, pageSize },
    });
    return data;
  },

  getJob: async (jobId: string): Promise<ImportJob> => {
    const { data } = await apiClient.get<ImportJob>(`/imports/jobs/${jobId}`);
    return data;
  },

  startFromDatasets: async (datasetName: string, campaignId: string) => {
    const { data } = await apiClient.post('/imports/start-datasets', {
      dataset_name: datasetName,
      campaign_id: campaignId,
    });
    return data;
  },
};
