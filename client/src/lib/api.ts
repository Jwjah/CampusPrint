import axios from 'axios';

// Auto-detect API URL for Vercel previews
const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL;
    if (!url.endsWith('/api')) {
      url = url.replace(/\/$/, '') + '/api';
    }
    return url;
  }
  if (typeof window !== 'undefined') {
    // If on Vercel preview, the API is usually on the same host but at /api
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 & 503 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined') {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else if (err.response?.status === 503) {
        const storedUser = localStorage.getItem('user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        if (user?.role !== 'admin' && !window.location.pathname.includes('/maintenance')) {
          window.location.href = '/maintenance';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
// Build Trigger: Sun May 10 19:05:22 IST 2026
