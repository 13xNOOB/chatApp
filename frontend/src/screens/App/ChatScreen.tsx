import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    Pressable, 
    KeyboardAvoidingView, 
    Platform,
    FlatList,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { AppStackParamList, AppNavigationProp } from '../../navigation/types';
import { messageApi } from '../../api/messageApi';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Message as BackendMessage } from '../../types';
import { useTheme } from '../../context/ThemeContext';

type ChatScreenRouteProp = RouteProp<AppStackParamList, 'Chat'>;

export default function ChatScreen() {
    const route = useRoute<ChatScreenRouteProp>();
    const navigation = useNavigation<AppNavigationProp>();
    const { userId: receiverId, userName, timezone } = route.params;
    const { user: currentUser } = useAuth();
    const { socket, sendMessage, markSeen, sendTypingStart, sendTypingStop, setActiveChatUserId, clearUnreadCount } = useChat();
    const { colors, isDark } = useTheme();

    const [messages, setMessages] = useState<BackendMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    
    // Pagination states
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Typing indicator state
    const [isReceiverTyping, setIsReceiverTyping] = useState(false);
    const receiverTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const myTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const pendingTimeouts = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
    const flatListRef = useRef<FlatList>(null);

    // Header update
    useEffect(() => {
        let titleStr = userName;
        if (timezone) {
            titleStr += ` (${timezone})`;
        }
        navigation.setOptions({
            headerTitle: titleStr,
        });
    }, [navigation, userName, timezone]);

    // Active chat state management
    useEffect(() => {
        setActiveChatUserId(receiverId);
        clearUnreadCount(receiverId);
        return () => {
            setActiveChatUserId(null);
        };
    }, [receiverId, setActiveChatUserId, clearUnreadCount]);

    // Initial fetch
    const fetchMessages = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await messageApi.getMessages(receiverId);
            if (res.success && res.data) {
                setMessages(res.data.messages);
                setNextCursor(res.data.pagination.nextCursor);
                setHasMore(res.data.pagination.hasMore);
                
                // Mark unread messages as seen immediately
                const unreadIds = res.data.messages
                    .filter(m => m.senderId === receiverId && m.status !== 'seen')
                    .map(m => m.id);
                if (unreadIds.length > 0) {
                    markSeen(unreadIds);
                }
            } else {
                setError('Failed to load messages');
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError('Network error loading messages');
        } finally {
            setIsLoading(false);
        }
    }, [receiverId, markSeen]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const loadOlderMessages = async () => {
        if (!hasMore || !nextCursor || isRefreshing) return;
        
        setIsRefreshing(true);
        try {
            const res = await messageApi.getMessages(receiverId, nextCursor);
            if (res.success && res.data) {
                const olderMessages = res.data.messages;
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newMessages = olderMessages.filter(m => !existingIds.has(m.id));
                    return [...newMessages, ...prev];
                });
                setNextCursor(res.data.pagination.nextCursor);
                setHasMore(res.data.pagination.hasMore);
            }
        } catch (err) {
            console.error('Error loading older messages:', err);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const onMessageAck = (payload: { clientTempId: string, message: BackendMessage }) => {
            const { clientTempId, message } = payload;
            
            if (pendingTimeouts.current[clientTempId]) {
                clearTimeout(pendingTimeouts.current[clientTempId]);
                delete pendingTimeouts.current[clientTempId];
            }
            
            setMessages(prev => prev.map(m => 
                m.clientTempId === clientTempId ? message : m
            ));
        };

        const onReceiveMessage = (payload: { message: BackendMessage }) => {
            const { message } = payload;
            if (message.senderId === receiverId || message.receiverId === receiverId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === message.id && message.id !== 0)) return prev;
                    return [...prev, message];
                });
                
                if (message.senderId === receiverId) {
                    markSeen([message.id]);
                }
            }
        };

        const onMessageSeen = (payload: { messageIds: number[], seenBy: number }) => {
            if (payload.seenBy === receiverId) {
                setMessages(prev => prev.map(m => 
                    payload.messageIds.includes(m.id)
                        ? { ...m, status: 'seen' }
                        : m
                ));
            }
        };

        const onTypingStart = (payload: { userId: number }) => {
            if (payload.userId === receiverId) {
                setIsReceiverTyping(true);
                if (receiverTypingTimeout.current) clearTimeout(receiverTypingTimeout.current);
                receiverTypingTimeout.current = setTimeout(() => {
                    setIsReceiverTyping(false);
                }, 5000);
            }
        };

        const onTypingStop = (payload: { userId: number }) => {
            if (payload.userId === receiverId) {
                setIsReceiverTyping(false);
                if (receiverTypingTimeout.current) clearTimeout(receiverTypingTimeout.current);
            }
        };

        socket.on('message_ack', onMessageAck);
        socket.on('receive_message', onReceiveMessage);
        socket.on('message_seen', onMessageSeen);
        socket.on('typing_start', onTypingStart);
        socket.on('typing_stop', onTypingStop);

        return () => {
            socket.off('message_ack', onMessageAck);
            socket.off('receive_message', onReceiveMessage);
            socket.off('message_seen', onMessageSeen);
            socket.off('typing_start', onTypingStart);
            socket.off('typing_stop', onTypingStop);
        };
    }, [socket, receiverId, markSeen]);

    useEffect(() => {
        return () => {
            Object.values(pendingTimeouts.current).forEach(clearTimeout);
            if (myTypingTimeout.current) clearTimeout(myTypingTimeout.current);
            if (receiverTypingTimeout.current) clearTimeout(receiverTypingTimeout.current);
        };
    }, []);

    const handleInputChanged = (text: string) => {
        setInputText(text);
        
        if (text.length > 0) {
            sendTypingStart(receiverId);
            if (myTypingTimeout.current) clearTimeout(myTypingTimeout.current);
            myTypingTimeout.current = setTimeout(() => {
                sendTypingStop(receiverId);
            }, 3000);
        } else {
            sendTypingStop(receiverId);
            if (myTypingTimeout.current) clearTimeout(myTypingTimeout.current);
        }
    };

    const handleSend = () => {
        if (!inputText.trim() || !currentUser) return;

        const textToSend = inputText.trim();
        const clientTempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        const newMsg: BackendMessage = {
            id: 0,
            clientTempId,
            senderId: currentUser.id,
            receiverId,
            message: textToSend,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        sendTypingStop(receiverId);
        
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        sendMessage(receiverId, textToSend, clientTempId);

        pendingTimeouts.current[clientTempId] = setTimeout(() => {
            setMessages(prev => prev.map(m => 
                m.clientTempId === clientTempId && m.status === 'pending'
                    ? { ...m, status: 'failed' }
                    : m
            ));
        }, 10000);
    };

    const handleRetry = (msg: BackendMessage) => {
        if (msg.status !== 'failed' || !msg.clientTempId) return;

        Alert.alert('Retry Message', 'Do you want to retry sending this message?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Retry', 
                onPress: () => {
                    setMessages(prev => prev.map(m => 
                        m.clientTempId === msg.clientTempId
                            ? { ...m, status: 'pending' }
                            : m
                    ));

                    sendMessage(receiverId, msg.message, msg.clientTempId!);

                    pendingTimeouts.current[msg.clientTempId!] = setTimeout(() => {
                        setMessages(prev => prev.map(m => 
                            m.clientTempId === msg.clientTempId && m.status === 'pending'
                                ? { ...m, status: 'failed' }
                                : m
                        ));
                    }, 10000);
                }
            }
        ]);
    };

    const formatTime = (dateString: string) => {
        try {
            const d = new Date(dateString);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const renderTicks = (item: BackendMessage) => {
        if (item.senderId !== currentUser?.id) return null;
        
        let icon = '';
        let color = colors.receiptSent;
        switch (item.status) {
            case 'pending': icon = '⌚'; color = colors.receiptPending; break;
            case 'sent': icon = '✓'; color = colors.receiptSent; break;
            case 'delivered': icon = '✓✓'; color = colors.receiptDelivered; break;
            case 'seen': icon = '✓✓'; color = colors.receiptSeen; break;
            case 'failed': icon = '❌'; color = colors.receiptFailed; break;
        }

        return <Text style={{ fontSize: 10, color, marginLeft: 6 }}>{icon}</Text>;
    };

    const renderMessage = ({ item }: { item: BackendMessage }) => {
        const isMine = item.senderId === currentUser?.id;
        const isFailed = item.status === 'failed';

        return (
            <View style={[styles.messageWrapper, isMine ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
                <Pressable 
                    onLongPress={() => isMine && isFailed ? handleRetry(item) : null}
                    style={[
                        styles.messageBubble, 
                        isMine ? { backgroundColor: colors.messageBubbleRight } : { backgroundColor: colors.messageBubbleLeft, borderColor: colors.border },
                        isFailed && { backgroundColor: colors.error }
                    ]}
                >
                    <Text style={[styles.messageText, isMine ? { color: colors.messageTextRight } : { color: colors.messageTextLeft }]}>
                        {item.message}
                    </Text>
                    <View style={styles.timeAndTicks}>
                        <Text style={[styles.messageTime, isMine ? { color: colors.messageTimeRight } : { color: colors.messageTimeLeft }]}>
                            {formatTime(item.createdAt)}
                        </Text>
                        {renderTicks(item)}
                    </View>
                </Pressable>
                {isFailed && (
                    <Pressable style={styles.inlineRetryBtn} onPress={() => handleRetry(item)}>
                        <Text style={[styles.inlineRetryText, { color: colors.error }]}>Retry</Text>
                    </Pressable>
                )}
            </View>
        );
    };

    const isEmptyMessage = inputText.trim().length === 0;
    const isMissingCurrentUser = !currentUser?.id;
    const isMissingReceiverId = !receiverId;
    const isSendDisabled = isEmptyMessage || isMissingCurrentUser || isMissingReceiverId;

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
        >
            <View style={styles.content}>
                {isLoading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.statusText, { color: colors.textSecondary }]}>Loading messages...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                        <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchMessages}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : messages.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No messages yet.</Text>
                        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Send a message to start the conversation!</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.clientTempId || item.id.toString()}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        refreshControl={
                            <RefreshControl 
                                refreshing={isRefreshing} 
                                onRefresh={loadOlderMessages} 
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                    />
                )}
                
                {isReceiverTyping && (
                    <View style={[styles.typingIndicatorContainer, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(245, 245, 245, 0.9)' }]}>
                        <Text style={[styles.typingIndicatorText, { color: colors.textSecondary }]}>{userName} is typing...</Text>
                    </View>
                )}
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#2c2c2c' : '#f1f1f1', color: colors.text }]}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textSecondary}
                    value={inputText}
                    onChangeText={handleInputChanged}
                    multiline
                />
                <Pressable 
                    style={[styles.sendButton, { backgroundColor: isSendDisabled ? colors.primaryDisabled : colors.primary }]} 
                    disabled={isSendDisabled}
                    onPress={handleSend}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={[styles.sendButtonText, isSendDisabled && { color: isDark ? '#888' : '#fff' }]}>Send</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        position: 'relative',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    statusText: {
        marginTop: 10,
        fontSize: 16,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 15,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40, // Room for typing indicator
    },
    messageWrapper: {
        marginBottom: 12,
        flexDirection: 'column',
    },
    messageWrapperRight: {
        alignItems: 'flex-end',
    },
    messageWrapperLeft: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent', // Default override
    },
    messageText: {
        fontSize: 16,
    },
    timeAndTicks: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
    },
    messageTime: {
        fontSize: 11,
    },
    inlineRetryBtn: {
        marginTop: 4,
    },
    inlineRetryText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    typingIndicatorContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 8,
        paddingHorizontal: 16,
    },
    typingIndicatorText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 16,
        maxHeight: 100,
        minHeight: 40,
    },
    sendButton: {
        marginLeft: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        justifyContent: 'center',
        height: 40,
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
