import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GiftedChat, IMessage, Bubble, BubbleProps, TimeProps } from 'react-native-gifted-chat';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { AppStackParamList, AppNavigationProp } from '../../navigation/types';
import { useChat } from '../../context/ChatContext';
import { messageApi } from '../../api/messageApi';
import { useAuth } from '../../context/AuthContext';
import { Message as BackendMessage } from '../../types';

type ChatScreenRouteProp = RouteProp<AppStackParamList, 'Chat'>;

export default function ChatScreen() {
    const route = useRoute<ChatScreenRouteProp>();
    const navigation = useNavigation<AppNavigationProp>();
    const { userId: receiverId, userName, timezone } = route.params;
    
    const { user: currentUser } = useAuth();
    const { socket, onlineUsers, sendMessage, markSeen, sendTypingStart, sendTypingStop } = useChat();

    const [messages, setMessages] = useState<IMessage[]>([]);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    
    // Derived states
    const isOnline = onlineUsers.has(receiverId);

    // Header updates
    useEffect(() => {
        let localTimeStr = '';
        if (timezone) {
            try {
                const date = new Date();
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                });
                localTimeStr = ` • ${formatter.format(date)}`;
            } catch (e) {
                // Ignore timezone errors
            }
        }

        navigation.setOptions({
            headerTitle: () => (
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>{userName}</Text>
                    <Text style={styles.headerSubtitle}>
                        {isOnline ? 'Online' : 'Offline'}{localTimeStr}
                    </Text>
                </View>
            ),
        });
    }, [navigation, userName, isOnline, timezone]);

    // Format backend message to GiftedChat message
    const formatMessage = useCallback((msg: BackendMessage): IMessage => {
        return {
            _id: msg.clientTempId && (msg.status === 'pending' || msg.status === 'failed') ? msg.clientTempId : msg.id.toString(),
            text: msg.message,
            createdAt: new Date(msg.createdAt),
            user: {
                _id: msg.senderId,
                name: msg.senderId === currentUser?.id ? currentUser?.name : userName,
            },
            sent: msg.status !== 'pending' && msg.status !== 'failed',
            received: msg.status === 'delivered' || msg.status === 'seen',
            pending: msg.status === 'pending',
            // We use a custom attribute to track the exact status for renderTicks
            status: msg.status 
        } as IMessage & { status: string };
    }, [currentUser, userName]);

    // Initial Fetch
    useEffect(() => {
        let isMounted = true;
        const fetchInitial = async () => {
            try {
                const res = await messageApi.getMessages(receiverId);
                if (res.success && res.data && isMounted) {
                    // Backend returns chronological. GiftedChat wants reverse chronological.
                    const formatted = res.data.messages.map(formatMessage).reverse();
                    setMessages(formatted);
                    
                    setNextCursor(res.data.pagination.nextCursor);
                    setHasMore(res.data.pagination.hasMore);
                    
                    // Mark newly fetched unread messages from this user as seen
                    const unreadIds = res.data.messages
                        .filter(m => m.senderId === receiverId && m.status !== 'seen')
                        .map(m => m.id);
                    if (unreadIds.length > 0) {
                        markSeen(unreadIds);
                    }
                }
            } catch (e) {
                console.error('Failed to load initial messages', e);
            }
        };
        fetchInitial();
        
        return () => { isMounted = false; };
    }, [receiverId, formatMessage, markSeen]);

    // Load Earlier
    const onLoadEarlier = async () => {
        if (!hasMore || !nextCursor || isLoadingEarlier) return;
        setIsLoadingEarlier(true);
        try {
            const res = await messageApi.getMessages(receiverId, nextCursor);
            if (res.success && res.data) {
                const formatted = res.data.messages.map(formatMessage).reverse();
                setMessages(prev => GiftedChat.append(prev, formatted, false));
                
                setNextCursor(res.data.pagination.nextCursor);
                setHasMore(res.data.pagination.hasMore);
            }
        } catch (e) {
            console.error('Failed to load older messages', e);
        } finally {
            setIsLoadingEarlier(false);
        }
    };

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const onReceiveMessage = (payload: { message: BackendMessage }) => {
            const { message } = payload;
            if (message.senderId === receiverId || message.receiverId === receiverId) {
                setMessages(prev => GiftedChat.append(prev, [formatMessage(message)]));
                
                // If it's from the other person, mark it as seen immediately since we are in the chat
                if (message.senderId === receiverId) {
                    markSeen([message.id]);
                }
            }
        };

        const onMessageAck = (payload: { clientTempId: string, message: BackendMessage }) => {
            const { clientTempId, message } = payload;
            setMessages(prev => 
                prev.map(msg => 
                    msg._id === clientTempId ? formatMessage(message) : msg
                )
            );
        };

        const onMessageSeen = (payload: { messageIds: number[], seenBy: number }) => {
            const { messageIds, seenBy } = payload;
            if (seenBy === receiverId) {
                setMessages(prev => 
                    prev.map(msg => 
                        messageIds.includes(Number(msg._id)) 
                            ? { ...msg, status: 'seen', received: true } as IMessage & { status: string }
                            : msg
                    )
                );
            }
        };

        const onTypingStart = (payload: { userId: number }) => {
            if (payload.userId === receiverId) setIsTyping(true);
        };

        const onTypingStop = (payload: { userId: number }) => {
            if (payload.userId === receiverId) setIsTyping(false);
        };

        socket.on('receive_message', onReceiveMessage);
        socket.on('message_ack', onMessageAck);
        socket.on('message_seen', onMessageSeen);
        socket.on('typing_start', onTypingStart);
        socket.on('typing_stop', onTypingStop);

        return () => {
            socket.off('receive_message', onReceiveMessage);
            socket.off('message_ack', onMessageAck);
            socket.off('message_seen', onMessageSeen);
            socket.off('typing_start', onTypingStart);
            socket.off('typing_stop', onTypingStop);
        };
    }, [socket, receiverId, formatMessage, markSeen]);

    const onSend = useCallback((newMessages: IMessage[] = []) => {
        if (!currentUser) return;
        
        newMessages.forEach(msg => {
            const clientTempId = msg._id.toString();
            
            // Optimistic append
            const optimisticMsg = {
                ...msg,
                pending: true,
                status: 'pending'
            } as IMessage & { status: string };
            
            setMessages(prev => GiftedChat.append(prev, [optimisticMsg]));
            
            // Send over socket
            sendMessage(receiverId, msg.text, clientTempId);
            
            // Optional: simulate timeout for failed state
            setTimeout(() => {
                setMessages(prev => 
                    prev.map(p => 
                        (p._id === clientTempId && p.pending)
                            ? { ...p, pending: false, status: 'failed' } as IMessage & { status: string }
                            : p
                    )
                );
            }, 10000); // 10s timeout to mark as failed
        });
    }, [currentUser, receiverId, sendMessage]);

    // Typing Debounce
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;
    const onInputTextChanged = (text: string) => {
        if (text.length > 0) {
            sendTypingStart(receiverId);
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                sendTypingStop(receiverId);
            }, 3000);
        }
    };

    const renderTicks = (message: IMessage) => {
        const msg = message as IMessage & { status?: string };
        if (message.user._id !== currentUser?.id) return null;

        let tickStr = '';
        let color = '#999';

        switch (msg.status) {
            case 'pending':
                tickStr = '⌚';
                break;
            case 'sent':
                tickStr = '✓';
                break;
            case 'delivered':
                tickStr = '✓✓';
                break;
            case 'seen':
                tickStr = '✓✓';
                color = '#34B7F1'; // Blue ticks
                break;
            case 'failed':
                tickStr = '❌';
                color = '#FF3B30';
                break;
            default:
                break;
        }

        return (
            <Text style={{ fontSize: 10, color, paddingRight: 4, paddingBottom: 2 }}>
                {tickStr}
            </Text>
        );
    };

    const onRetry = (message: IMessage) => {
        const msg = message as IMessage & { status?: string };
        if (msg.status === 'failed') {
            // Reset to pending
            setMessages(prev => 
                prev.map(p => 
                    p._id === message._id 
                        ? { ...p, status: 'pending', pending: true } as IMessage & { status: string }
                        : p
                )
            );
            sendMessage(receiverId, message.text, message._id.toString());
        }
    };

    const renderBubble = (props: BubbleProps<IMessage>) => {
        const msg = props.currentMessage as IMessage & { status?: string };
        return (
            <TouchableOpacity 
                onLongPress={() => onRetry(props.currentMessage!)}
                disabled={msg.status !== 'failed'}
                activeOpacity={0.8}
            >
                <Bubble
                    {...props}
                    renderTicks={() => renderTicks(props.currentMessage!)}
                    wrapperStyle={{
                        right: {
                            backgroundColor: msg.status === 'failed' ? '#FF3B30' : '#007AFF',
                            opacity: msg.pending ? 0.7 : 1
                        }
                    }}
                />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <GiftedChat
                messages={messages}
                onSend={messages => onSend(messages)}
                user={{
                    _id: currentUser?.id || 0,
                    name: currentUser?.name
                }}
                loadEarlierMessagesProps={{
                    isAvailable: hasMore,
                    isLoading: isLoadingEarlier,
                    onPress: onLoadEarlier,
                    isInfiniteScrollEnabled: true
                }}
                textInputProps={{ onChangeText: onInputTextChanged }}
                isTyping={isTyping}
                renderBubble={renderBubble}
                listProps={{
                    initialNumToRender: 15,
                    maxToRenderPerBatch: 10,
                    windowSize: 5
                }}
                isSendButtonAlwaysVisible
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#666',
    },
});
