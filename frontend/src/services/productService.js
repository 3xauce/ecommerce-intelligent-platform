import apiClient from './apiClient';

export const productService = {
  list: (params = {}) => apiClient.get('/products', { params }).then((res) => res.data),
  getById: (id) => apiClient.get(`/products/${id}`).then((res) => res.data),

  create: (payload) => apiClient.post('/products', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/products/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/products/${id}`).then((res) => res.data),

  uploadImages: (id, files) => {
    const formData = new FormData();
    for (const file of files) formData.append('images', file);
    return apiClient
      .post(`/products/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },
  removeImage: (id, url) =>
    apiClient.delete(`/products/${id}/images`, { data: { url } }).then((res) => res.data),
};
