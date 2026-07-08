import { createMMKV } from 'react-native-mmkv';
import { User } from '../types';

export const storage = createMMKV();

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

export const storageService = {
    setToken(token: string) {
        storage.set(TOKEN_KEY, token);
    },
    getToken(): string | null {
        return storage.getString(TOKEN_KEY) || null;
    },
    removeToken() {
        storage.remove(TOKEN_KEY);
    },
    setUser(user: User) {
        storage.set(USER_KEY, JSON.stringify(user));
    },
    getUser(): User | null {
        const userStr = storage.getString(USER_KEY);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr) as User;
        } catch {
            return null;
        }
    },
    removeUser() {
        storage.remove(USER_KEY);
    },
    saveOfflineQueue(userId: number, queue: any[]) {
        storage.set(`offlineQueue_${userId}`, JSON.stringify(queue));
    },
    getOfflineQueue(userId: number): any[] {
        const queueStr = storage.getString(`offlineQueue_${userId}`);
        if (!queueStr) return [];
        try {
            return JSON.parse(queueStr);
        } catch {
            return [];
        }
    },
    saveCachedContacts(userId: number, contacts: User[]) {
        storage.set(`cachedContacts_${userId}`, JSON.stringify(contacts));
    },
    getCachedContacts(userId: number): User[] | null {
        const str = storage.getString(`cachedContacts_${userId}`);
        if (!str) return null;
        try {
            return JSON.parse(str);
        } catch {
            return null;
        }
    },
    saveCachedMessages(currentUserId: number, receiverId: number, messages: any[]) {
        storage.set(`cachedMessages_${currentUserId}_${receiverId}`, JSON.stringify(messages));
    },
    getCachedMessages(currentUserId: number, receiverId: number): any[] | null {
        const str = storage.getString(`cachedMessages_${currentUserId}_${receiverId}`);
        if (!str) return null;
        try {
            return JSON.parse(str);
        } catch {
            return null;
        }
    },
    clearAll() {
        storage.clearAll();
    }
};
