import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export const RootNavigator = () => {
    const { token, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {token ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
};
