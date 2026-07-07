import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export const notificationService = {
    async requestNotificationPermission(): Promise<boolean> {
        if (Platform.OS === 'ios') {
            // iOS APNs configuration is deliberately skipped for this milestone to keep simulator safe.
            return false;
        }

        try {
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.warn('POST_NOTIFICATIONS permission denied');
                    return false;
                }
            }

            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            
            return enabled;
        } catch (e) {
            console.error('Failed to request notification permission:', e);
            return false;
        }
    },

    async getFcmToken(): Promise<string | null> {
        if (Platform.OS === 'ios') {
            return null;
        }

        try {
            // Check if permission is granted first
            const hasPermission = await this.requestNotificationPermission();
            if (!hasPermission) {
                console.warn('Cannot get FCM token without permission');
                return null;
            }

            // Await FCM token
            const token = await messaging().getToken();
            console.log('FCM token fetched successfully:', token);
            return token;
        } catch (e) {
            console.error('Failed to get FCM token:', e);
            return null;
        }
    },

    initializeForegroundNotificationHandler() {
        if (Platform.OS === 'ios') return () => {};

        try {
            const unsubscribe = messaging().onMessage(async remoteMessage => {
                console.log('A new FCM message arrived in the foreground!', JSON.stringify(remoteMessage));
                // We'll just log it for now. ChatScreen will later handle actual in-app updates.
            });
            return unsubscribe;
        } catch (e) {
            console.log('Failed to initialize foreground handler:', e);
            return () => {};
        }
    },

    getDevicePlatform(): 'android' | 'ios' | 'web' | 'windows' | 'macos' {
        return Platform.OS;
    }
};
