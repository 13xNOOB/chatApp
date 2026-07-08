import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
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

    useEffect(() => {
        let isMounted = true;
        const fetchUsers = async () => {
            try {
                const response = await userApi.getUsers();
                if (response.success && isMounted) {
                    setUsers(response.data);
                }
            } catch (e) {
                console.error('Failed to fetch users:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchUsers();
        
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Logged in as {user?.name}</Text>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: 'yellow', padding: 10 }}>
                <Text style={{ fontWeight: 'bold', color: 'black', textAlign: 'center' }}>
                    NEW UI ACTIVE — {new Date().toISOString()}
                </Text>
            </View>
            
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList 
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.userItem}
                            onPress={() => navigation.navigate('Chat', { userId: item.id, userName: item.name, timezone: item.timezone })}
                        >
                            <Text style={styles.userName}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    logoutText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    userItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    userName: {
        fontSize: 16,
    },
    emptyText: {
        textAlign: 'center',
        padding: 24,
        color: '#888',
    },
});
