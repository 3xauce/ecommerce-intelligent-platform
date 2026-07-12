import apiClient from './apiClient';

export const categoryService = {
  list: () => apiClient.get('/categories').then((res) => res.data),
  create: (payload) => apiClient.post('/categories', payload).then((res) => res.data),
};
