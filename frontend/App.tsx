import React, { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNav from './src/navigation/AppNav';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/context/ThemeContext';
import { notificationService } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    notificationService.checkAndResync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <AppNav />
          </SafeAreaProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
