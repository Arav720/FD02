import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { signIn, signOut, getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { EnvelopeIcon, LockClosedIcon } from 'react-native-heroicons/outline';
import { useStorage, STORAGE_KEYS } from '../hooks/useStorage';
import { studentApi } from '../services/api';

// Define navigation stack parameter list
type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

interface UserData {
  id:string,
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  accessToken: string;
  userId: string;
}

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { setItem } = useStorage();
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async (): Promise<void> => {
    // Validation
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Error', 'Please enter both email and password.');
    }

    if (!validateEmail(email)) {
      return Alert.alert('Error', 'Please enter a valid email address.');
    }

    if (password.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters long.');
    }

    setLoading(true);
    
    try {
      // Sign out any existing session
      await signOut();
      
      // Sign in the user
      const { isSignedIn } = await signIn({ 
        username: email, 
        password 
      });

      if (isSignedIn) {
        console.log('User signed in successfully');
        
        try {
          const studentId = await studentApi.getStudentByEmail(email);
          // Get current user and their attributes
          const currentUser = await getCurrentUser();
          const userAttributes = await fetchUserAttributes();
          const session = await fetchAuthSession();
          const accesstoken = session.tokens?.accessToken?.toString();
          // Extract user data
          const userData: UserData = {
            id:studentId.id || '',
            firstName: userAttributes.given_name || '',
            lastName: userAttributes.family_name || '',
            email: userAttributes.email || email,
            phoneNumber: userAttributes.phone_number || '',
            accessToken: accesstoken || '',
            userId: currentUser.userId || currentUser.username || '',
          };
          console.log("User data:", userData);

          // Store user data in AsyncStorage
          await setItem(STORAGE_KEYS.CURRENT_USER, userData);
          console.log('User data stored in AsyncStorage:', STORAGE_KEYS.CURRENT_USER);

          // Show success message and navigate
          Alert.alert(
            'Success!',
            `Welcome back ${userData.firstName || 'User'}!`,
            [
              {
                text: 'OK',
                onPress: () => navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })
              }
            ]
          );
          
        } catch (storageError) {
          console.error('Error storing user data:', storageError);
          // Still navigate to home even if storage fails
          Alert.alert(
            'Success!',
            'Welcome back!',
            [
              {
                text: 'OK',
                onPress: () => navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })
              }
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('SignIn Error:', error);
      
      let errorMessage = 'Sign in failed';
      
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Invalid email or password';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'User not found. Please check your email or sign up';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please verify your email before signing in';
      } else if (error.name === 'PasswordResetRequiredException') {
        errorMessage = 'Password reset required. Please check your email';
      } else if (error.name === 'TooManyFailedAttemptsException') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="flex-1 justify-center px-6 py-8">
              {/* Header */}
              <View className="items-center mb-8">
                <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
                  <Text className="text-white font-bold text-2xl">FD</Text>
                </View>
                <Text className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome Back
                </Text>
                <Text className="text-gray-600 text-center">
                  Sign in to your Focus Desk account
                </Text>
              </View>

              {/* Form */}
              <View className="space-y-6">
                {/* Email Input */}
                <View>
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Email Address *
                  </Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                    <EnvelopeIcon size={20} color="#6b7280" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email address"
                      className="flex-1 ml-3 text-gray-800 text-base"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View>
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Password *
                  </Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                    <LockClosedIcon size={20} color="#6b7280" />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      className="flex-1 ml-3 text-gray-800 text-base"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      autoComplete="password"
                    />
                  </View>
                </View>

                {/* Sign In Button */}
                <Pressable
                  onPress={handleSignIn}
                  disabled={loading}
                  className={`py-4 rounded-xl mt-6 ${
                    loading ? 'bg-gray-300' : 'bg-blue-600'
                  }`}
                >
                  {loading ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator color="white" size="small" />
                      <Text className="text-white font-semibold text-lg ml-2">
                        Signing In...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white text-center font-semibold text-lg">
                      Sign In
                    </Text>
                  )}
                </Pressable>

                {/* Navigation Links */}
                <View className="space-y-3 mt-6">
                  {/* Sign Up Link */}
                  <Pressable
                    onPress={() => navigation.navigate('Signup')}
                    className="py-3"
                  >
                    <Text className="text-center text-blue-600 font-medium text-base">
                      Don't have an account? Sign Up
                    </Text>
                  </Pressable>

                  {/* Forgot Password Link */}
                  <Pressable
                    onPress={() => navigation.navigate('ForgotPassword')}
                    className="py-3"
                  >
                    <Text className="text-center text-gray-600 font-medium text-base">
                      Forgot Password?
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Footer */}
              <View className="mt-12">
                <Text className="text-center text-gray-500 text-sm">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default LoginScreen;


// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Pressable,
//   SafeAreaView,
//   Alert,
//   ActivityIndicator,
//   StatusBar,
// } from 'react-native';
// import { UserIcon, EnvelopeIcon } from 'react-native-heroicons/outline';
// import { useStorage, STORAGE_KEYS } from '../hooks/useStorage';
// import { RootStackScreenProps } from '../types/navigation';

// export default function LoginScreen({ navigation }: RootStackScreenProps<'Login'>) {
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const { setItem, getItem } = useStorage();

//   const handleLogin = async () => {
//     if (!name.trim() || !email.trim()) {
//       Alert.alert('Missing Information', 'Please enter both name and email.');
//       return;
//     }

//     if (!email.includes('@')) {
//       Alert.alert('Invalid Email', 'Please enter a valid email address.');
//       return;
//     }

//     setIsLoading(true);

//     try {
//       // Check if user already exists
//       const existingUsers = getItem<any[]>(STORAGE_KEYS.ALL_USERS) || [];
//       const existingUser = existingUsers.find(user => user.email === email.trim());

//       if (existingUser) {
//         // User exists, log them in
//         setItem(STORAGE_KEYS.CURRENT_USER, existingUser);
//         Alert.alert('Welcome Back!', `Hello ${existingUser.name}`, [
//           { text: 'OK', onPress: () => navigation.replace('Home') }
//         ]);
//       } else {
//         // Create new user
//         const newUser = {
//           id: `user_${Date.now()}`,
//           name: name.trim(),
//           email: email.trim(),
//           studentId: 'stu-1', // Map to backend student ID for API calls
//           createdAt: new Date().toISOString(),
//         };

//         const updatedUsers = [...existingUsers, newUser];
//         setItem(STORAGE_KEYS.ALL_USERS, updatedUsers);
//         setItem(STORAGE_KEYS.CURRENT_USER, newUser);

//         Alert.alert('Account Created!', `Welcome ${newUser.name}`, [
//           { text: 'OK', onPress: () => navigation.replace('Home') }
//         ]);
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Something went wrong. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <>
//       <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
//       <SafeAreaView className="flex-1 bg-gray-50">
//         <View className="flex-1 justify-center px-6">
//           {/* Header */}
//           <View className="items-center mb-8">
//             <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
//               <Text className="text-white font-bold text-2xl">FD</Text>
//             </View>
//             <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome</Text>
//             <Text className="text-gray-600 text-center">
//               Enter your details to continue
//             </Text>
//           </View>

//           {/* Form */}
//           <View className="space-y-4">
//             {/* Name Input */}
//             <View>
//               <Text className="text-base font-medium text-gray-700 mb-2">
//                 Full Name
//               </Text>
//               <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
//                 <UserIcon size={20} color="#6b7280" />
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   placeholder="Enter your full name"
//                   className="flex-1 ml-3 text-gray-800 text-base"
//                   placeholderTextColor="#9ca3af"
//                   autoCapitalize="words"
//                 />
//               </View>
//             </View>

//             {/* Email Input */}
//             <View>
//               <Text className="text-base font-medium text-gray-700 mb-2">
//                 Email Address
//               </Text>
//               <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
//                 <EnvelopeIcon size={20} color="#6b7280" />
//                 <TextInput
//                   value={email}
//                   onChangeText={setEmail}
//                   placeholder="Enter your email"
//                   className="flex-1 ml-3 text-gray-800 text-base"
//                   placeholderTextColor="#9ca3af"
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                 />
//               </View>
//             </View>

//             {/* Login Button */}
//             <Pressable
//               onPress={handleLogin}
//               disabled={!name.trim() || !email.trim() || isLoading}
//               className={`py-4 rounded-xl mt-6 ${
//                 name.trim() && email.trim() && !isLoading
//                   ? 'bg-blue-600'
//                   : 'bg-gray-300'
//               }`}
//             >
//               {isLoading ? (
//                 <ActivityIndicator color="white" />
//               ) : (
//                 <Text className="text-white text-center font-semibold text-lg">
//                   Continue
//                 </Text>
//               )}
//             </Pressable>
//           </View>

//           {/* Footer */}
//           <View className="mt-8">
//             <Text className="text-center text-gray-500 text-sm">
//               By continuing, you agree to our Terms of Service and Privacy Policy
//             </Text>
//           </View>
//         </View>
//       </SafeAreaView>
//     </>
//   );
// }