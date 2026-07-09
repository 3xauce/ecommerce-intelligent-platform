import apiClient from './apiClient';

export const authService = {
  register: (payload) => apiClient.post('/auth/register', payload).then((res) => res.data),
  login: (payload) => apiClient.post('/auth/login', payload).then((res) => res.data),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }).then((res) => res.data),
  getMe: () => apiClient.get('/users/me').then((res) => res.data),
  updateMe: (payload) => apiClient.put('/users/me', payload).then((res) => res.data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }).then((res) => res.data),
  resetPassword: (token, password) =>
    apiClient.post('/auth/reset-password', { token, password }).then((res) => res.data),
};
