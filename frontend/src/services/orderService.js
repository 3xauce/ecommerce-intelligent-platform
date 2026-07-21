import apiClient from './apiClient';

export const orderService = {
  checkout: ({ currency = 'eur', shippingAddress }) =>
    apiClient
      .post('/orders/checkout', { currency, shipping_address: shippingAddress })
      .then((res) => res.data),
  list: (params = {}) => apiClient.get('/orders', { params }).then((res) => res.data),
  getById: (id) => apiClient.get(`/orders/${id}`).then((res) => res.data),
  syncPayment: (id) => apiClient.post(`/orders/${id}/sync-payment`).then((res) => res.data),
};
