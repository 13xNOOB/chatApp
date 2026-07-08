import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { storageService } from '../services/storage';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = storageService.getToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    (error: any) => {
        console.error('[DEBUG] Axios Response Error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data,
            hasRequest: !!error.request
        });
        // Handle global unauthorized or network errors here if necessary
        return Promise.reject(error);
    }
);
