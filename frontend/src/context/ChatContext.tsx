import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import { SOCKET_URL } from '../config/env';
import { useAuth } from './AuthContext';
import { Message as BackendMessage } from '../types';
import { storageService } from '../services/storage';

interface ChatContextData {
    socket: Socket | null;
    isConnected: boolean;
    isNetworkConnected: boolean;
    onlineUsers: Set<number>;
    typingUsers: Set<number>;
    unreadCounts: Record<number, number>;
    pendingMessagesQueue: BackendMessage[];
    setUnreadCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
    setActiveChatUserId: (userId: number | null) => void;
    clearUnreadCount: (userId: number) => void;
    connectSocket: () => void;
    disconnectSocket: () => void;
    sendMessage: (receiverId: number, message: string, clientTempId: string) => void;
    retryMessage: (msg: BackendMessage) => void;
    markSeen: (messageIds: number[]) => void;
    sendTypingStart: (receiverId: number) => void;
    sendTypingStop: (receiverId: number) => void;
}

const ChatContext = createContext<ChatContextData>({} as ChatContextData);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isNetworkConnected, setIsNetworkConnected] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
    const [pendingMessagesQueue, setPendingMessagesQueue] = useState<BackendMessage[]>([]);
    
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutsRef = useRef<{ [key: number]: ReturnType<typeof setTimeout> }>({});
    const activeChatUserIdRef = useRef<number | null>(null);
    const isFlushingRef = useRef(false);

    // Initialize queue from storage on user change
    useEffect(() => {
        if (user?.id) {
            const savedQueue = storageService.getOfflineQueue(user.id);
            setPendingMessagesQueue(savedQueue);
        } else {
            setPendingMessagesQueue([]);
        }
    }, [user?.id]);

    const setActiveChatUserId = useCallback((userId: number | null) => {
        activeChatUserIdRef.current = userId;
    }, []);

    const clearUnreadCount = useCallback((userId: number) => {
        setUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
    }, []);

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
            activeChatUserIdRef.current = null;
            setUnreadCounts({});
        }
    }, []);

    const flushQueue = useCallback(async (currentSocket: Socket, currentUserId: number) => {
        if (isFlushingRef.current) return;
        isFlushingRef.current = true;
        
        try {
            // Get fresh queue from storage to avoid stale state in closures
            const queue = storageService.getOfflineQueue(currentUserId);
            if (queue.length === 0) return;

            console.log(`[ChatContext] Flushing ${queue.length} messages from offline queue`);

            for (const msg of queue) {
                // Do not auto-flush failed messages, let user explicitly retry them
                if (msg.status === 'failed') continue;
                if (!currentSocket.connected) break;

                console.log(`[ChatContext] Sending queued message ${msg.clientTempId}`);
                currentSocket.emit('send_message', {
                    clientTempId: msg.clientTempId,
                    receiverId: msg.receiverId,
                    message: msg.message
                });

                // Wait for ack before sending next
                await new Promise<void>(resolve => {
                    const timeout = setTimeout(() => {
                        console.warn(`[ChatContext] Ack timeout for queued message ${msg.clientTempId}`);
                        currentSocket.off('message_ack', onAck);
                        // Mark as failed in queue
                        setPendingMessagesQueue(prev => {
                            const next = prev.map(m => m.clientTempId === msg.clientTempId ? { ...m, status: 'failed' } as BackendMessage : m);
                            storageService.saveOfflineQueue(currentUserId, next);
                            return next;
                        });
                        resolve();
                    }, 10000);

                    const onAck = (payload: { clientTempId: string }) => {
                        if (payload.clientTempId === msg.clientTempId) {
                            clearTimeout(timeout);
                            currentSocket.off('message_ack', onAck);
                            resolve();
                        }
                    };
                    currentSocket.on('message_ack', onAck);
                });
            }
        } finally {
            isFlushingRef.current = false;
        }
    }, []);

    const connectSocket = useCallback(() => {
        if (!token || !user?.id) return;
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
            flushQueue(newSocket, user.id);
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

        newSocket.on('receive_message', (payload: { message: BackendMessage }) => {
            const { message } = payload;
            const senderId = message.senderId;
            
            if (activeChatUserIdRef.current !== senderId) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [senderId]: (prev[senderId] || 0) + 1
                }));
            }
        });

        newSocket.on('message_ack', (payload: { clientTempId: string, message: BackendMessage }) => {
            console.log('[ChatContext] message_ack:', payload.clientTempId);
            setPendingMessagesQueue(prev => {
                // If it was in the queue, remove it since it's acknowledged
                const next = prev.filter(m => m.clientTempId !== payload.clientTempId);
                if (next.length !== prev.length && user?.id) {
                    storageService.saveOfflineQueue(user.id, next);
                }
                return next;
            });
        });
        
        newSocket.on('message_seen', (payload: { messageIds: number[], seenBy: number }) => {
            // No action needed for local counts here
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
    }, [token, user?.id, flushQueue]);

    // Network tracking
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = !!state.isConnected && !!state.isInternetReachable;
            setIsNetworkConnected(online);
            if (online && socketRef.current && !socketRef.current.connected) {
                // Socket.io usually reconnects automatically, but we can nudge it
                socketRef.current.connect();
            }
        });
        return () => unsubscribe();
    }, []);

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
        if (!user?.id) return;
        
        const newMsg: BackendMessage = {
            id: 0,
            clientTempId,
            senderId: user.id,
            receiverId,
            message: message,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        if (socketRef.current?.connected && isNetworkConnected) {
            // Online path
            setPendingMessagesQueue(prev => {
                const next = [...prev, newMsg];
                storageService.saveOfflineQueue(user.id, next);
                return next;
            });

            socketRef.current.emit('send_message', {
                clientTempId,
                receiverId,
                message
            });

            // Set timeout for ack
            setTimeout(() => {
                setPendingMessagesQueue(prev => {
                    if (prev.some(m => m.clientTempId === clientTempId)) {
                        const next = prev.map(m => m.clientTempId === clientTempId ? { ...m, status: 'failed' } as BackendMessage : m);
                        storageService.saveOfflineQueue(user.id, next);
                        return next;
                    }
                    return prev;
                });
            }, 10000);

        } else {
            // Offline path
            console.log('[ChatContext] Offline or disconnected, queuing message', clientTempId);
            setPendingMessagesQueue(prev => {
                const next = [...prev, newMsg];
                storageService.saveOfflineQueue(user.id, next);
                return next;
            });
        }
    }, [user?.id, isNetworkConnected]);

    const retryMessage = useCallback((msg: BackendMessage) => {
        if (!user?.id || !msg.clientTempId) return;

        // Move it back to pending
        setPendingMessagesQueue(prev => {
            const next = prev.map(m => m.clientTempId === msg.clientTempId ? { ...m, status: 'pending' } as BackendMessage : m);
            storageService.saveOfflineQueue(user.id, next);
            return next;
        });

        if (socketRef.current?.connected && isNetworkConnected) {
            socketRef.current.emit('send_message', {
                clientTempId: msg.clientTempId,
                receiverId: msg.receiverId,
                message: msg.message
            });
            // Re-arm timeout
            setTimeout(() => {
                setPendingMessagesQueue(prev => {
                    if (prev.some(m => m.clientTempId === msg.clientTempId)) {
                        const next = prev.map(m => m.clientTempId === msg.clientTempId ? { ...m, status: 'failed' } as BackendMessage : m);
                        storageService.saveOfflineQueue(user.id, next);
                        return next;
                    }
                    return prev;
                });
            }, 10000);
        } else {
            // If we retry while still offline, it just goes back to pending/queued status and stays there
        }
    }, [user?.id, isNetworkConnected]);

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
            isNetworkConnected,
            onlineUsers,
            typingUsers,
            unreadCounts,
            pendingMessagesQueue,
            setUnreadCounts,
            setActiveChatUserId,
            clearUnreadCount,
            connectSocket,
            disconnectSocket,
            sendMessage,
            retryMessage,
            markSeen,
            sendTypingStart,
            sendTypingStop
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
