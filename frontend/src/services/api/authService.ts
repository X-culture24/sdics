import apiClient from '@/api/axios';
import type { User, Role } from '@/types/api';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  roles: Role[];
}

interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    } as LoginRequest);
    return data;
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const { data } = await apiClient.post<RefreshResponse>('/auth/refresh', {
      refreshToken,
    } as RefreshRequest);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/users/me');
    return data;
  },
};
