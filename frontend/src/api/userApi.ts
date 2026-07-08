import { apiClient } from './client';
import { User } from '../types';

export const userApi = {
    getUsers: async (): Promise<{ success: boolean; data: User[] }> => {
        const response = await apiClient.get<{ success: boolean; data: { users: User[] } }>('/users');
        return {
            success: response.data.success,
            data: response.data.data.users
        };
    }
};
