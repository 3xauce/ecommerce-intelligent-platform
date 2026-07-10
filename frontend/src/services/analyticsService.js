import apiClient from './apiClient';

export const analyticsService = {
  dashboard: (days = 30) =>
    apiClient.get('/analytics/dashboard', { params: { days } }).then((res) => res.data),
  competitors: (days = 30) =>
    apiClient.get('/analytics/competitors', { params: { days } }).then((res) => res.data),

  async downloadCsv(type) {
    const res = await apiClient.get('/analytics/export/csv', {
      params: { type },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = type === 'sales' ? 'ventes.csv' : 'concurrents.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
