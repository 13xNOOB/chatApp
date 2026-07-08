import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../navigation/types';
import { userApi } from '../../api/userApi';
import { User } from '../../types';

export default function UserListScreen() {
    const { logout, user } = useAuth();
    const navigation = useNavigation<AppNavigationProp>();
    
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async (isRefresh = false) => {
        try {
            setError(null);
            if (!isRefresh) setLoading(true);
            const response = await userApi.getUsers();
            if (response.success) {
                setUsers(response.data);
            } else {
                setError('Failed to fetch users');
            }
        } catch (e: any) {
            console.error('Failed to fetch users:', e);
            setError(e?.message || 'Network error occurred while fetching users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers(true);
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
        
        return (
            <TouchableOpacity 
                style={styles.userItem}
                onPress={() => navigation.navigate('Chat', { userId: item.id, userName: item.name, timezone: item.timezone })}
            >
                <View style={styles.userHeader}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.timeText}>{timeStr}</Text>
                </View>
                <Text style={styles.emailText}>{item.email}</Text>
                <View style={styles.statusRow}>
                    <Text style={styles.timezoneText}>{item.timezone}</Text>
                    {isOutOfOffice && (
                        <View style={styles.oooBadge}>
                            <Text style={styles.oooText}>Out of Office</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Contacts</Text>
                    <Text style={styles.headerSubtitle}>Logged in as {user?.name}</Text>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
            
            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchUsers()}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList 
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={users.length === 0 ? styles.emptyContainer : null}
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <Text style={styles.emptyText}>No other users found in the system.</Text>
                            <Text style={styles.emptySubText}>Create another account to start chatting!</Text>
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
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
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
        backgroundColor: '#fff',
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
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#007AFF',
    },
    emailText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timezoneText: {
        fontSize: 12,
        color: '#888',
    },
    oooBadge: {
        backgroundColor: '#FFF0F0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFB3B3',
    },
    oooText: {
        fontSize: 10,
        color: '#FF3B30',
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#FF3B30',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
