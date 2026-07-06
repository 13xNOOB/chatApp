import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { notificationService } from './src/services/notificationService';

function App(): React.JSX.Element {
    React.useEffect(() => {
        const unsubscribe = notificationService.initializeForegroundNotificationHandler();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </SafeAreaProvider>
    );
}

export default App;
