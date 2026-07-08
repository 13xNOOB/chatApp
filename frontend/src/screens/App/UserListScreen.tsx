import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../navigation/types';
import { userApi } from '../../api/userApi';
import { User } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useChat } from '../../context/ChatContext';
import { storageService } from '../../services/storage';

export default function UserListScreen() {
    const { logout, user } = useAuth();
    const navigation = useNavigation<AppNavigationProp>();
    const { colors, isDark, setTheme, theme } = useTheme();
    const { onlineUsers, typingUsers, unreadCounts, setUnreadCounts, isNetworkConnected } = useChat();
    
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isShowingCached, setIsShowingCached] = useState(false);

    const fetchUsers = useCallback(async (isRefresh = false) => {
        if (!user?.id) return;
        try {
            setError(null);
            if (!isRefresh && users.length === 0) setLoading(true);
            const response = await userApi.getUsers();
            if (response.success && response.data) {
                setUsers(response.data);
                setIsShowingCached(false);
                storageService.saveCachedContacts(user.id, response.data);
                
                // Hydrate unread counts
                const initialUnreadCounts: Record<number, number> = {};
                response.data.forEach(u => {
                    if (u.unreadCount) {
                        initialUnreadCounts[u.id] = u.unreadCount;
                    }
                });
                setUnreadCounts(prev => ({ ...initialUnreadCounts, ...prev }));
            } else {
                throw new Error('Failed to fetch users');
            }
        } catch (e: any) {
            console.error('Failed to fetch users:', e);
            
            if (!isNetworkConnected || e.message === 'Network Error' || e.message.includes('fetch')) {
                const cached = storageService.getCachedContacts(user.id);
                if (cached && cached.length > 0) {
                    setUsers(cached);
                    setIsShowingCached(true);
                    
                    const initialUnreadCounts: Record<number, number> = {};
                    cached.forEach(u => {
                        if (u.unreadCount) {
                            initialUnreadCounts[u.id] = u.unreadCount;
                        }
                    });
                    setUnreadCounts(prev => ({ ...initialUnreadCounts, ...prev }));
                    return; // Skip setting error since we loaded cache
                }
            }

            if (!isRefresh && users.length === 0) {
                setError(!isNetworkConnected 
                    ? 'No cached contacts available. Connect to the internet once to load contacts.' 
                    : (e?.message || 'Network error occurred while fetching users')
                );
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [setUnreadCounts, isNetworkConnected, user?.id, users.length]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers(true);
    };

    const toggleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    const getThemeIcon = () => {
        if (theme === 'light') return '☀️';
        if (theme === 'dark') return '🌙';
        return '⚙️'; // system
    };

    const getContactLocalStatus = (timezone: string) => {
        try {
            const date = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            });
            const parts = formatter.formatToParts(date);
            const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
            const timeStr = formatter.format(date);
            
            // Assume office hours are 9 AM to 5 PM
            const isOutOfOffice = hour < 9 || hour >= 17;
            
            return {
                timeStr,
                isOutOfOffice
            };
        } catch {
            return { timeStr: 'Unknown', isOutOfOffice: false };
        }
    };

    const renderItem = ({ item }: { item: User }) => {
        const { timeStr, isOutOfOffice } = getContactLocalStatus(item.timezone);
        const isOnline = onlineUsers.has(item.id);
        const isTyping = typingUsers.has(item.id);
        const unreadCount = unreadCounts[item.id] || 0;
        
        return (
            <TouchableOpacity 
                style={[styles.userItem, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate('Chat', { userId: item.id, userName: item.name, timezone: item.timezone })}
            >
                <View style={styles.userHeader}>
                    <View style={styles.nameContainer}>
                        <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.textSecondary }]} />
                        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                        {unreadCount > 0 && (
                            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.timeText, { color: colors.primary }]}>{timeStr}</Text>
                </View>
                <View style={styles.emailRow}>
                    <Text style={[styles.emailText, { color: colors.textSecondary }]}>{item.email}</Text>
                    {isTyping && (
                        <Text style={[styles.typingText, { color: colors.primary }]}>Typing...</Text>
                    )}
                </View>
                <View style={styles.statusRow}>
                    <Text style={[styles.timezoneText, { color: colors.textSecondary }]}>{item.timezone}</Text>
                    {isOutOfOffice && (
                        <View style={[styles.oooBadge, { backgroundColor: isDark ? '#3a1c1c' : '#FFF0F0', borderColor: isDark ? '#5a2a2a' : '#FFB3B3' }]}>
                            <Text style={styles.oooText}>Out of Office</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Contacts</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Logged in as {user?.name}</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
                        <Text style={styles.themeText}>{getThemeIcon()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error }]} onPress={logout}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {(!isNetworkConnected && isShowingCached) && (
                <View style={[styles.offlineBanner, { backgroundColor: '#f39c12' }]}>
                    <Text style={styles.offlineBannerText}>Offline — showing cached contacts</Text>
                </View>
            )}
            
            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => fetchUsers()}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList 
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                    }
                    contentContainerStyle={users.length === 0 ? styles.emptyContainer : null}
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <Text style={[styles.emptyText, { color: colors.text }]}>No other users found in the system.</Text>
                            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Create another account to start chatting!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    themeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    themeText: {
        fontSize: 18,
    },
    logoutButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyContainer: {
        flexGrow: 1,
    },
    userItem: {
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    userHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '500',
    },
    emailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 14,
    },
    typingText: {
        fontSize: 12,
        fontStyle: 'italic',
        fontWeight: '500',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timezoneText: {
        fontSize: 12,
    },
    oooBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    oooText: {
        fontSize: 10,
        color: '#FF3B30',
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        marginBottom: 16,
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
    unreadBadge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    offlineBanner: {
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offlineBannerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    }
});
