import {
  getData,
  postData,
  putData,
  TokenManager,
} from './client';
import type {
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  User,
} from '@/types/dto';

export const authApi = {
  login: (req: LoginRequest) =>
    postData<LoginRequest, LoginResponse>('/auth/login', req),

  refresh: (refreshToken: string) =>
    postData<RefreshRequest, RefreshResponse>('/auth/refresh', { refreshToken }),

  logout: () =>
    postData<any, { message: string }>('/auth/logout', {}).finally(() => {
      TokenManager.clearAll();
    }),

  me: () => getData<User>('/me'),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    putData<{ oldPassword: string; newPassword: string }, { message: string }>(
      '/me/password',
      data,
    ),

  forgotPassword: (email: string) =>
    postData<{ email: string }, { message: string }>('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; password: string }) =>
    postData<{ token: string; password: string }, { message: string }>(
      '/auth/reset-password',
      data,
    ),

  saveSession: (resp: LoginResponse) => {
    TokenManager.setAccessToken(resp.accessToken);
    TokenManager.setRefreshToken(resp.refreshToken);
    TokenManager.setUser(resp.user);
  },
};
