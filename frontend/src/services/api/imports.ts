import { getData, postData } from './client';
import { downloadBlob } from '@/utils/format';
import type { ID, ImportJob, PaginationResponse } from '@/types/dto';

export const importsApi = {
  startFromDatasets: (confirm = true) =>
    postData<{ confirm: boolean }, ImportJob>('/imports/from-datasets', { confirm }),

  uploadFile: (file: File, params?: { campaignId?: ID; onProgress?: (pct: number) => void }) => {
    const fd = new FormData();
    fd.append('file', file);
    if (params?.campaignId) fd.append('campaign_id', String(params.campaignId));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/imports/upload', true);
    const token = localStorage.getItem('nvrcms:access');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    return new Promise<ImportJob>((resolve, reject) => {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = (ev.loaded / ev.total) * 100;
          params?.onProgress?.(pct);
        }
      };
      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText) as ImportJob);
          } else {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err?.error?.message ?? 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Malformed response from server'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(fd);
    });
  },

  list: (params?: { page?: number; pageSize?: number }) =>
    getData<PaginationResponse<ImportJob>>('/imports', params),

  get: (id: ID) => getData<ImportJob>(`/imports/${id}`),

  downloadError: (filename: string) => {
    const blob = new Blob([`Errors for ${filename}\n(Detail CSV to be implemented later)`], {
      type: 'text/csv',
    });
    downloadBlob(blob, filename.replace(/\.xlsx?$/i, '_errors.csv'));
  },
};
