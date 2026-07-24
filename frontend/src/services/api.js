import axios from 'axios';

const configuredBase = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
const api = axios.create({ baseURL: configuredBase.endsWith('/api') ? configuredBase : `${configuredBase}/api` });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export default api;
