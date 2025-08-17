import React, { useEffect, useRef } from 'react';
import { Text, View, Dimensions, StatusBar, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useStorage, STORAGE_KEYS } from '../hooks/useStorage';
import { RootStackScreenProps } from '../types/navigation';
import logoImage from '../assets/images/logo.png';

const { height } = Dimensions.get('window');

export default function SplashScreen({ navigation }: RootStackScreenProps<'Splash'>) {
  const ringSize1 = useSharedValue(height * 0.2);
  const ringSize2 = useSharedValue(height * 0.2);
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const hasNavigated = useRef(false);
  const { getItem } = useStorage();

  const checkUserAndNavigate = async () => {
    try {
      // Check for saved user session
      const savedUser = await getItem(STORAGE_KEYS.CURRENT_USER);
      
      if (savedUser && !hasNavigated.current) {
        console.log('✅ User session found, navigating to Home');
        hasNavigated.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else if (!hasNavigated.current) {
        console.log('❌ No user session found, navigating to Login');
        hasNavigated.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }
  };

  useEffect(() => {
    // Start animations
    ringSize1.value = withSpring(height * 0.3, { damping: 10, stiffness: 90 });

    setTimeout(() => {
      ringSize2.value = withRepeat(
        withSpring(height * 0.4, { damping: 12, stiffness: 70 }),
        -1,
        true
      );
    }, 200);

    setTimeout(() => {
      logoScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      logoOpacity.value = withSpring(1);
    }, 400);

    setTimeout(() => {
      textScale.value = withSpring(1, { damping: 10, stiffness: 80 });
      textOpacity.value = withTiming(1, { duration: 400 });
    }, 700);

    // Check user session and navigate after animation
    const timer = setTimeout(() => {
      checkUserAndNavigate();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    width: ringSize1.value,
    height: ringSize1.value,
    borderRadius: ringSize1.value / 2,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    width: ringSize2.value,
    height: ringSize2.value,
    borderRadius: ringSize2.value / 2,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textOpacity.value,
  }));

  const logoSize = height * 0.2;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Animated rings */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            backgroundColor: 'rgba(250, 204, 21, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 0,
          },
          ring2Style,
        ]}
      >
        <Animated.View
          style={[
            {
              backgroundColor: 'rgba(250, 204, 21, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            },
            ring1Style,
          ]}
        >
          <Animated.Image
            source={logoImage}
            style={[
              {
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize / 2,
              },
              logoStyle,
            ]}
            resizeMode="cover"
          />
        </Animated.View>
      </Animated.View>

      {/* App Name + Tagline */}
      <Animated.View
        style={[
          {
            alignItems: 'center',
            marginTop: Math.min(height * 0.45, 300),
          },
          textAnimatedStyle,
        ]}
      >
        <Text
          style={{
            fontFamily: 'Okra',
            fontSize: height * 0.07,
            fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
            color: '#facc15',
            letterSpacing: 1.5,
          }}
        >
          Focus Desk
        </Text>
        <Text
          style={{
            fontFamily: 'Okra',
            fontSize: height * 0.02,
            fontWeight: '500',
            color: '#e2e8f0',
            marginTop: 8,
            letterSpacing: 1,
          }}
        >
          Welcome to Focus Desk
        </Text>
      </Animated.View>
    </View>
  );
}