import { getData, postData, putData, patchData, deleteData } from './client';
import type {
  AdminUnit,
  ID,
  PaginationResponse,
  QueryParams,
  Role,
  User,
} from '@/types/dto';

export const usersApi = {
  list: (params?: QueryParams) =>
    getData<PaginationResponse<User>>('/users', params),

  get: (id: ID) => getData<User>(`/users/${id}`),

  create: (body: Partial<User> & { email: string; fullName: string; roleId: ID }) =>
    postData<Partial<User>, User>('/users', body),

  update: (id: ID, body: Partial<User>) =>
    putData<Partial<User>, User>(`/users/${id}`, body),

  setActive: (id: ID, isActive: boolean) =>
    patchData<{ isActive: boolean }, User>(`/users/${id}/active`, { isActive }),

  resetPassword: (id: ID, newPassword: string) =>
    postData<{ password: string }, { message: string }>(
      `/users/${id}/reset-password`,
      { password: newPassword },
    ),

  listRoles: async () => {
    const response = await getData<{ data?: Role[] }>('/roles');
    return response.data ?? [];
  },
};

export const adminUnitsApi = {
  list: (params?: QueryParams) =>
    getData<PaginationResponse<AdminUnit>>('/admin-units', params),

  get: (id: ID) => getData<AdminUnit>(`/admin-units/${id}`),

  create: (body: Partial<AdminUnit> & { name: string; level: number }) =>
    postData<Partial<AdminUnit>, AdminUnit>('/admin-units', body),

  update: (id: ID, body: Partial<AdminUnit>) =>
    putData<Partial<AdminUnit>, AdminUnit>(`/admin-units/${id}`, body),

  delete: (id: ID) => deleteData(`/admin-units/${id}`),

  descendants: (id: ID) =>
    getData<AdminUnit[]>(`/admin-units/${id}/descendants`),
};
