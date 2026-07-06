import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
    Login: undefined;
    Registration: undefined;
};

export type AppStackParamList = {
    UserList: undefined;
    Chat: { userId: number; userName: string };
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type AppNavigationProp = NativeStackNavigationProp<AppStackParamList>;
