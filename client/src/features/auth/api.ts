import { api } from '../../services/api';
import type { ApiResponse, User } from '../../types';

interface AuthPayload {
  user: User;
  accessToken: string;
}

export const authApi = {
  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const { data } = await api.post<ApiResponse<AuthPayload>>('/auth/register', input);
    return data.data;
  },

  async login(input: { email: string; password: string }) {
    const { data } = await api.post<ApiResponse<AuthPayload>>('/auth/login', input);
    return data.data;
  },

  async logout() {
    await api.post('/auth/logout');
  },

  async me() {
    const { data } = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return data.data.user;
  },
};
