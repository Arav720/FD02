// App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import amplifyconfig from './src/amplifyconfiguration.json';
import Navigation from './src/navigation/Navigation';
import { useStorage, STORAGE_KEYS } from './src/hooks/useStorage';
import './global.css';

const queryClient = new QueryClient();

// Configure Amplify
Amplify.configure(amplifyconfig);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Splash' | 'Login' | 'Home'>('Splash');
  const { getItem } = useStorage();

  const checkUserSession = async () => {
    try {
      // Check for saved user session in AsyncStorage
      const savedUser = await getItem(STORAGE_KEYS.CURRENT_USER);
      
      if (savedUser) {
        console.log('✅ Saved user found:', savedUser);
        // Also check AWS Cognito session
        try {
          const session = await fetchAuthSession();
          const accessToken = session.tokens?.accessToken?.toString();
          
          if (accessToken) {
            console.log('✅ Valid AWS session found');
            setInitialRoute('Home');
          } else {
            console.log('❌ No valid AWS session, redirecting to login');
            setInitialRoute('Login');
          }
        } catch (cognitoError) {
          console.log('❌ AWS session check failed, but local user exists');
          setInitialRoute('Home'); // Still allow access with local session
        }
      } else {
        console.log('❌ No saved user found');
        setInitialRoute('Login');
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Add a small delay to show splash screen animation
    const timer = setTimeout(() => {
      checkUserSession();
    }, 2000); // 2 seconds to show splash animation

    // Listen to auth events
    const unsubscribe = Hub.listen('auth', ({ payload: { event } }) => {
      console.log('Hub Auth Event detected:', event);
      if (event === 'signedIn' || event === 'signedOut' || event === 'tokenRefresh') {
        checkUserSession();
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Navigation initialRoute={initialRoute} />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});