import apiClient from './apiClient';

export const notificationService = {
  list: (params = {}) => apiClient.get('/notifications', { params }).then((res) => res.data),
  markRead: (id) => apiClient.put(`/notifications/${id}/read`).then((res) => res.data),
  markAllRead: () => apiClient.put('/notifications/read-all').then((res) => res.data),
};
