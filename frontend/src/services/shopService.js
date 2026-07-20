import apiClient from './apiClient';

export const shopService = {
  getMine: () => apiClient.get('/shops/me').then((res) => res.data),
  create: (payload) => apiClient.post('/shops', payload).then((res) => res.data),
  updateMine: (payload) => apiClient.put('/shops/me', payload).then((res) => res.data),
  listAll: () => apiClient.get('/shops').then((res) => res.data),
};
