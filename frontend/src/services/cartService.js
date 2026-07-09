import apiClient from './apiClient';

export const cartService = {
  get: () => apiClient.get('/cart').then((res) => res.data),
  addItem: (productId, quantity = 1) =>
    apiClient.post('/cart/items', { product_id: productId, quantity }).then((res) => res.data),
  updateItem: (productId, quantity) =>
    apiClient.put(`/cart/items/${productId}`, { quantity }).then((res) => res.data),
  removeItem: (productId) =>
    apiClient.delete(`/cart/items/${productId}`).then((res) => res.data),
  clear: () => apiClient.delete('/cart').then((res) => res.data),
};
