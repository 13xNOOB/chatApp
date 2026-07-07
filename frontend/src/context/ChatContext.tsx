import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/env';
import { useAuth } from './AuthContext';

interface ChatContextData {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Set<number>;
    connectSocket: () => void;
    disconnectSocket: () => void;
    sendMessage: (receiverId: number, message: string, clientTempId: string) => void;
    markSeen: (messageIds: number[]) => void;
    sendTypingStart: (receiverId: number) => void;
    sendTypingStop: (receiverId: number) => void;
}

const ChatContext = createContext<ChatContextData>({} as ChatContextData);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
    
    const socketRef = useRef<Socket | null>(null);

    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            console.log('[ChatContext] Disconnecting socket manually');
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
            setOnlineUsers(new Set());
        }
    }, []);

    const connectSocket = useCallback(() => {
        if (!token) return;
        if (socketRef.current?.connected) return;

        console.log('[ChatContext] Initializing socket connection');
        const newSocket = io(SOCKET_URL, {
            auth: {
                token: token
            }
        });

        // Clean up previous listeners if any
        newSocket.removeAllListeners();

        newSocket.on('connect', () => {
            console.log('[ChatContext] Socket connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[ChatContext] Socket disconnected');
            setIsConnected(false);
            setOnlineUsers(new Set());
        });

        newSocket.on('user_online', (payload: { userId: number }) => {
            console.log('[ChatContext] user_online:', payload);
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.add(payload.userId);
                return next;
            });
        });

        newSocket.on('user_offline', (payload: { userId: number }) => {
            console.log('[ChatContext] user_offline:', payload);
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(payload.userId);
                return next;
            });
        });

        // Global listeners for other events (components will also attach their own listeners)
        newSocket.on('receive_message', (payload) => {
            console.log('[ChatContext] receive_message:', payload);
        });

        newSocket.on('message_ack', (payload) => {
            console.log('[ChatContext] message_ack:', payload);
        });

        newSocket.on('message_seen', (payload) => {
            console.log('[ChatContext] message_seen:', payload);
        });

        newSocket.on('typing_start', (payload) => {
            console.log('[ChatContext] typing_start:', payload);
        });

        newSocket.on('typing_stop', (payload) => {
            console.log('[ChatContext] typing_stop:', payload);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
    }, [token]);

    // Automatically manage connection lifecycle based on auth token
    useEffect(() => {
        if (token) {
            connectSocket();
        } else {
            disconnectSocket();
        }
        
        return () => {
            disconnectSocket();
        };
    }, [token, connectSocket, disconnectSocket]);

    const sendMessage = useCallback((receiverId: number, message: string, clientTempId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('send_message', {
                clientTempId,
                receiverId,
                message
            });
        } else {
            console.warn('[ChatContext] Cannot emit send_message, socket disconnected');
        }
    }, []);

    const markSeen = useCallback((messageIds: number[]) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('mark_seen', {
                messageIds
            });
        } else {
            console.warn('[ChatContext] Cannot emit mark_seen, socket disconnected');
        }
    }, []);

    const sendTypingStart = useCallback((receiverId: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('typing_start', { receiverId });
        }
    }, []);

    const sendTypingStop = useCallback((receiverId: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('typing_stop', { receiverId });
        }
    }, []);

    return (
        <ChatContext.Provider value={{
            socket,
            isConnected,
            onlineUsers,
            connectSocket,
            disconnectSocket,
            sendMessage,
            markSeen,
            sendTypingStart,
            sendTypingStop
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
