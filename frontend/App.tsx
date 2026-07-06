import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
// Import firebase setup stubs
import './src/utils/firebaseStubs';

function App(): React.JSX.Element {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </SafeAreaProvider>
    );
}

export default App;
