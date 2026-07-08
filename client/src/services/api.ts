import axios from 'axios';
import { useAuthStore } from '../features/auth/store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const { data } = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const { user, accessToken } = data.data;
    useAuthStore.getState().setAuth(user, accessToken);
    return accessToken;
  } catch {
    useAuthStore.getState().clearAuth();
    return null;
  }
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && useAuthStore.getState().accessToken) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);
