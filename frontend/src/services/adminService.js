import apiClient from './apiClient';

export const adminService = {
  stats: () => apiClient.get('/admin/stats').then((res) => res.data),
  orders: (params = {}) => apiClient.get('/admin/orders', { params }).then((res) => res.data),
  users: (params = {}) => apiClient.get('/users', { params }).then((res) => res.data),
  setUserRole: (id, role) => apiClient.put(`/users/${id}/role`, { role }).then((res) => res.data),
  setUserStatus: (id, isActive) =>
    apiClient.put(`/users/${id}/status`, { is_active: isActive }).then((res) => res.data),
};
