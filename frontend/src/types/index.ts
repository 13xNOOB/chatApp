export interface User {
    id: number;
    name: string;
    email: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    success: boolean;
    data?: {
        user: User;
        token: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

export interface RegisterResponse {
    success: boolean;
    data?: {
        user: User;
    };
    error?: {
        code: string;
        message: string;
    };
}
