import { apiClient } from './client';

import { GetMessagesResponse } from '../types';

export const messageApi = {
    getMessages: async (userId: number, cursor?: number, limit?: number): Promise<GetMessagesResponse> => {
        const params = new URLSearchParams();
        if (cursor) params.append('cursor', cursor.toString());
        if (limit) params.append('limit', limit.toString());
        
        const response = await apiClient.get(`/messages/${userId}?${params.toString()}`);
        return response.data;
    }
};
