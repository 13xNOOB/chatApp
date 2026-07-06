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
    clearAll() {
        storage.clearAll();
    }
};
