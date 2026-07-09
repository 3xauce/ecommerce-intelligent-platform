import apiClient from './apiClient';

export const productService = {
  list: (params = {}) => apiClient.get('/products', { params }).then((res) => res.data),
  getById: (id) => apiClient.get(`/products/${id}`).then((res) => res.data),
};
