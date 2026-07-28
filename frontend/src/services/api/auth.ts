import client from './client';

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    client.post('/auth/login', credentials),
  
  getMe: () =>
    client.get('/auth/me'),
  
  logout: () =>
    client.post('/auth/logout'),
};
