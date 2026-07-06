import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, RegisterResponse } from '../types';
import { storageService } from '../services/storage';
import { authApi } from '../api/authApi';

interface AuthContextData {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<AuthResponse>;
    register: (name: string, email: string, password: string, timezone: string) => Promise<RegisterResponse>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load initial state from MMKV
        const storedToken = storageService.getToken();
        const storedUser = storageService.getUser();
        
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(storedUser);
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await authApi.login(email, password);
        if (response.success && response.data) {
            const { token: newToken, user: newUser } = response.data;
            storageService.setToken(newToken);
            storageService.setUser(newUser);
            setToken(newToken);
            setUser(newUser);
        }
        return response;
    };

    const register = async (name: string, email: string, password: string, timezone: string) => {
        const response = await authApi.register(name, email, password, timezone);
        // Note: registration does not auto-login unless a token is returned
        return response;
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (e) {
            // Ignore network errors on logout
        } finally {
            storageService.clearAll();
            setToken(null);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
