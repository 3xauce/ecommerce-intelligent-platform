import apiClient from './apiClient';

export const aiService = {
  predictions: (productId) =>
    apiClient.get(`/ai/predictions/${productId}`).then((res) => res.data),
  trends: () => apiClient.get('/ai/trends').then((res) => res.data),
  magicCompare: (url) => apiClient.post('/ai/magic-compare', { url }).then((res) => res.data),
};
