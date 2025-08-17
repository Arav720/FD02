// src/navigation/Navigation.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import TabNavigator from './TabNavigator';
import LibraryDetailsScreen from '../screens/LibraryDetailsScreen';
import EnhancedBookingScreen from '../screens/EnhancedBookingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { RootStackParamList } from '../types/navigation';

interface NavigationProps {
  initialRoute: 'Splash' | 'Login' | 'Home';
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation({ initialRoute }: NavigationProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={TabNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="LibraryDetails" component={LibraryDetailsScreen} />
        <Stack.Screen name="Booking" component={EnhancedBookingScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}