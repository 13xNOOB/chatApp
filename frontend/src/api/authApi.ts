import { apiClient } from './client';
import { AuthResponse, RegisterResponse } from '../types';

export const authApi = {
    login: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
        return response.data;
    },
    register: async (name: string, email: string, password: string, timezone: string): Promise<RegisterResponse> => {
        const response = await apiClient.post<RegisterResponse>('/auth/register', { name, email, password, timezone });
        return response.data;
    },
    logout: async (): Promise<{ success: boolean }> => {
        const response = await apiClient.post<{ success: boolean }>('/auth/logout');
        return response.data;
    }
};
