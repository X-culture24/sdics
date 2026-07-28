import client from './client';

export const dashboardApi = {
  getOverview: () =>
    client.get('/dashboard'),
};
