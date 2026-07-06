import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../../navigation/types';

export default function RegistrationScreen() {
    const { register } = useAuth();
    const navigation = useNavigation<AuthNavigationProp>();
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Default timezone from device
    const [timezone, setTimezone] = useState(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return 'UTC';
        }
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async () => {
        if (!name || !email || !password || !timezone) {
            setError('Please fill in all fields');
            return;
        }
        
        setError('');
        setLoading(true);
        try {
            const res = await register(name, email, password, timezone);
            if (res.success) {
                Alert.alert('Success', 'Registration successful! Please login.', [
                    { text: 'OK', onPress: () => navigation.navigate('Login') }
                ]);
            } else {
                setError(res.error?.message || 'Registration failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Account</Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TextInput
                style={styles.input}
                placeholder="Timezone (e.g. America/New_York)"
                value={timezone}
                onChangeText={setTimezone}
                autoCapitalize="none"
            />
            
            <TouchableOpacity 
                style={styles.button} 
                onPress={handleRegister}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.linkButton} 
                onPress={() => navigation.navigate('Login')}
            >
                <Text style={styles.linkText}>Already have an account? Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 32,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 16,
        marginBottom: 16,
        borderRadius: 8,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    linkButton: {
        marginTop: 24,
        alignItems: 'center',
    },
    linkText: {
        color: '#007AFF',
        fontSize: 14,
    },
    errorText: {
        color: 'red',
        marginBottom: 16,
        textAlign: 'center',
    },
});
