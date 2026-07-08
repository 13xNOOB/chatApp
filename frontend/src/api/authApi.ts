import { apiClient } from './client';
import { AuthResponse, RegisterResponse } from '../types';

export const authApi = {
    login: async (email: string, password: string, deviceToken?: string, platform?: string): Promise<AuthResponse> => {
        console.log('[DEBUG] Auth API Request:', {
            apiBaseUrl: apiClient.defaults.baseURL,
            url: '/auth/login',
            method: 'POST',
            hasDeviceToken: !!deviceToken,
            deviceToken
        });
        const response = await apiClient.post<AuthResponse>('/auth/login', { email, password, deviceToken, platform });
        return response.data;
    },
    register: async (name: string, email: string, password: string, timezone: string): Promise<RegisterResponse> => {
        console.log('[DEBUG] Auth API Request:', {
            apiBaseUrl: apiClient.defaults.baseURL,
            url: '/auth/register',
            method: 'POST',
            hasDeviceToken: false
        });
        const response = await apiClient.post<RegisterResponse>('/auth/register', { name, email, password, timezone });
        return response.data;
    },
    logout: async (deviceToken?: string): Promise<{ success: boolean }> => {
        const response = await apiClient.post<{ success: boolean }>('/auth/logout', { deviceToken });
        return response.data;
    }
};
