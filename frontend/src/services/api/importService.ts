import apiClient from '@/api/axios';

export const importService = {
  startFromDatasets: async () => {
    const { data } = await apiClient.post('/imports/from-datasets', { confirm: true });
    return data;
  },

  listJobs: async (page: number = 1, pageSize: number = 20) => {
    const { data } = await apiClient.get('/imports', { params: { page, page_size: pageSize } });
    return data;
  },

  getJob: async (jobId: string) => {
    const { data } = await apiClient.get(`/imports/${jobId}`);
    return data;
  },
};
