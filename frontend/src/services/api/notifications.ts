import { getData, postData, patchData, deleteData } from './client';
import type { ID, Notification, Setting } from '@/types/dto';

export const notificationsApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    getData<{ data: Notification[]; total: number }>('/notifications', params),

  markRead: (id: ID) => patchData<any, { message: string }>(`/notifications/${id}/read`, {}),

  markAllRead: () => postData<any, { message: string }>('/notifications/read-all', {}),

  delete: (id: ID) => deleteData(`/notifications/${id}`),

  unreadCount: async (): Promise<number> => {
    try {
      const res = await getData<any>('/notifications/unread-count');
      if (res && typeof res.count === 'number') return res.count;
      return 0;
    } catch {
      return 0;
    }
  },
};
