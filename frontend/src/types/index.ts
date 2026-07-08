export interface User {
    id: number;
    name: string;
    email: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    unreadCount?: number;
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

export interface Message {
    id: number;
    senderId: number;
    receiverId: number;
    message: string;
    status: 'pending' | 'sent' | 'delivered' | 'seen' | 'failed';
    createdAt: string;
    clientTempId?: string;
}

export interface Pagination {
    nextCursor: number | null;
    hasMore: boolean;
    limit: number;
}

export interface GetMessagesResponse {
    success: boolean;
    data?: {
        messages: Message[];
        pagination: Pagination;
    };
    error?: {
        code: string;
        message: string;
    };
}
