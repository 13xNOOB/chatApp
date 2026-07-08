import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/env';
import { useAuth } from './AuthContext';

interface ChatContextData {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Set<number>;
    typingUsers: Set<number>;
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
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
    
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutsRef = useRef<{ [key: number]: ReturnType<typeof setTimeout> }>({});

    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            console.log('[ChatContext] Disconnecting socket manually');
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
            setOnlineUsers(new Set());
            setTypingUsers(new Set());
            Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
            typingTimeoutsRef.current = {};
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

        newSocket.removeAllListeners();

        newSocket.on('connect', () => {
            console.log('[ChatContext] Socket connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[ChatContext] Socket disconnected');
            setIsConnected(false);
            setOnlineUsers(new Set());
            setTypingUsers(new Set());
            Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
            typingTimeoutsRef.current = {};
        });

        newSocket.on('user_online', (payload: { userId: number }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.add(payload.userId);
                return next;
            });
        });

        newSocket.on('user_offline', (payload: { userId: number }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(payload.userId);
                return next;
            });
        });

        newSocket.on('online_users', (payload: { userIds: number[] }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                payload.userIds.forEach(id => next.add(id));
                return next;
            });
        });

        newSocket.on('typing_start', (payload: { userId: number }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.add(payload.userId);
                return next;
            });

            if (typingTimeoutsRef.current[payload.userId]) {
                clearTimeout(typingTimeoutsRef.current[payload.userId]);
            }
            typingTimeoutsRef.current[payload.userId] = setTimeout(() => {
                setTypingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(payload.userId);
                    return next;
                });
            }, 5000);
        });

        newSocket.on('typing_stop', (payload: { userId: number }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.delete(payload.userId);
                return next;
            });
            if (typingTimeoutsRef.current[payload.userId]) {
                clearTimeout(typingTimeoutsRef.current[payload.userId]);
                delete typingTimeoutsRef.current[payload.userId];
            }
        });

        // Other generic logging listeners
        newSocket.on('receive_message', (payload) => console.log('[ChatContext] receive_message:', payload));
        newSocket.on('message_ack', (payload) => console.log('[ChatContext] message_ack:', payload));
        newSocket.on('message_seen', (payload) => console.log('[ChatContext] message_seen:', payload));

        socketRef.current = newSocket;
        setSocket(newSocket);
    }, [token]);

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
            typingUsers,
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
