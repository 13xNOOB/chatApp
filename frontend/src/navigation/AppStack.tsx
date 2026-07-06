import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from './types';
import UserListScreen from '../screens/App/UserListScreen';
import ChatScreen from '../screens/App/ChatScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppStack = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="UserList" component={UserListScreen} options={{ title: 'Contacts' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params.userName })} />
        </Stack.Navigator>
    );
};
