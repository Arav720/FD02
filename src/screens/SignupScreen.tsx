import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { signUp, confirmSignUp, deleteUser } from 'aws-amplify/auth';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  IdentificationIcon,
} from 'react-native-heroicons/outline';
import { studentApi } from '../services/api';
import {
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
} from 'aws-amplify/auth';
import { useStorage, STORAGE_KEYS } from '../hooks/useStorage';


// Define navigation stack parameter list
type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
};

interface studentData {
  cognitoId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  accessToken: string;
  userId: string;
}

const SignupScreen: React.FC = () => {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { setItem } = useStorage();
  const [cognitoId, setCognitoId] = useState<string>('');

  const validatePhoneNumber = (phone: string): boolean => {
    // Indian phone number validation - exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const deleteUserFromCognito = async (): Promise<void> => {
    try {
      await deleteUser();
      console.log('User deleted from Cognito successfully');
    } catch (error) {
      console.error('Error deleting user from Cognito:', error);
    }
  };

  const showOtpAlert = (): void => {
    setShowOtpModal(true);
  };

  const closeOtpModal = (): void => {
    setShowOtpModal(false);
    setOtp('');
  };

  const handleCancelOtp = async (): Promise<void> => {
    // Delete user if OTP verification is cancelled
    await deleteUserFromCognito();
    closeOtpModal();
    Alert.alert(
      'Verification Cancelled',
      'Your account has been removed. Please sign up again.',
      [{ text: 'OK' }],
    );
  };

  const handleConfirmOtp = async (otpCode: string): Promise<void> => {
    if (!otpCode || !otpCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }

    setOtpLoading(true);
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: otpCode.trim(),
      });
      console.log('isSignUpComplete:', isSignUpComplete);
      if (isSignUpComplete) {
        closeOtpModal();
        // Clear form data
        const userData = await studentApi.createStudent({
          cognitoId: cognitoId,
          username: email,
          email: email,
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber
        })
        
        console.log("User creation in API : ", userData);

        setFirstName('');
        setLastName('');
        setEmail('');
        setPhoneNumber('');
        setPassword('');
        setConfirmPassword('');

        Alert.alert(
          'Success!',
          'Email verified successfully! Please log in with your credentials.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ],
        );
      } else {
        closeOtpModal();
        Alert.alert(
          'Verification Incomplete',
          'Email confirmed, but further steps are required. Please log in.',
          [
            {
              text: 'OK',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              }),
            },
          ],
        );
      }
    } catch (err: any) {
      console.error('OTP Confirmation Error:', err);

      // Delete user on OTP verification failure
      await deleteUserFromCognito();
      closeOtpModal();

      let errorMessage =
        'Failed to verify code. Your account has been removed. Please sign up again.';

      if (err.name === 'CodeMismatchException') {
        errorMessage =
          'Invalid verification code. Your account has been removed. Please sign up again.';
      } else if (err.name === 'ExpiredCodeException') {
        errorMessage =
          'Verification code has expired. Your account has been removed. Please sign up again.';
      } else if (err.message) {
        errorMessage = `${err.message}. Your account has been removed. Please sign up again.`;
      }

      Alert.alert('Verification Failed', errorMessage, [
        {
          text: 'OK',
          onPress: () => {
            // Clear form data
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhoneNumber('');
            setPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignUp = async (): Promise<void> => {
    // Validation
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !phoneNumber.trim() ||
      !password ||
      !confirmPassword
    ) {
      return Alert.alert('Error', 'Please fill all fields');
    }

    if (!validateEmail(email)) {
      return Alert.alert('Error', 'Please enter a valid email address');
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return Alert.alert(
        'Error',
        'Please enter a valid 10-digit Indian phone number',
      );
    }

    if (password.length < 8) {
      return Alert.alert(
        'Error',
        'Password must be at least 8 characters long',
      );
    }

    if (password !== confirmPassword) {
      return Alert.alert('Error', 'Passwords do not match');
    }

    setLoading(true);
    try {
      // Format phone number for AWS Cognito (add +91 for Indian numbers)
      const formattedPhone = `+91${phoneNumber}`;

      const { userId, isSignUpComplete } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name: `${firstName} ${lastName}`,
            given_name: firstName,
            family_name: lastName,
            phone_number: formattedPhone,
          },
          autoSignIn: false,
        },
      });
      let user = userId as string;
      setCognitoId(user);
      console.log('User ID ', cognitoId);
      if (!isSignUpComplete) {
        // Show OTP verification alert
        Alert.alert(
          'Verification Required',
          'A verification code has been sent to your email. Please check your inbox and spam folder.',
          [
            {
              text: 'OK',
              onPress: showOtpAlert,
            },
          ],
        );
      } else {
        Alert.alert('Success', 'Sign up complete! You can now log in.', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Signup error', err);
      let errorMessage: string = 'Signup failed';

      if (err.name === 'UsernameExistsException') {
        errorMessage = 'An account with this email already exists';
      } else if (err.name === 'InvalidPasswordException') {
        errorMessage = 'Password does not meet requirements';
      } else if (err.message) {
        errorMessage = err.message;
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
                  Create Account
                </Text>
                <Text className="text-gray-600 text-center">
                  Join Focus Desk today and start learning
                </Text>
              </View>

              {/* Form */}
              <View className="space-y-4">
                {/* First Name Input */}
                <View>
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    First Name *
                  </Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                    <UserIcon size={20} color="#6b7280" />
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Enter your first name"
                      className="flex-1 ml-3 text-gray-800 text-base"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Last Name Input */}
                <View>
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Last Name *
                  </Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                    <IdentificationIcon size={20} color="#6b7280" />
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Enter your last name"
                      className="flex-1 ml-3 text-gray-800 text-base"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

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
                    />
                  </View>
                </View>

                {/* Phone Number Input */}
                <View>
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Phone Number *
                  </Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                    <PhoneIcon size={20} color="#6b7280" />
                    <Text className="text-gray-600 text-base mr-2">+91</Text>
                    <TextInput
                      value={phoneNumber}
                      onChangeText={text => {
                        // Only allow digits and limit to 10 characters
                        const digitsOnly = text.replace(/\D/g, '');
                        if (digitsOnly.length <= 10) {
                          setPhoneNumber(digitsOnly);
                        }
                      }}
                      placeholder="Enter your phone number"
                      className="flex-1 ml-1 text-gray-800 text-base"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                  <Text className="text-xs text-gray-500 mt-1">
                    Enter 10-digit mobile number without +91
                  </Text>
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
                      placeholder="Enter password (min 8 characters)"
                      className="flex-1 ml-3 text-gray-800 text-base"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View>
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                    <LockClosedIcon size={20} color="#6b7280" />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm your password"
                      className="flex-1 ml-3 text-gray-800 text-base"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Sign Up Button */}
                <Pressable
                  onPress={handleSignUp}
                  disabled={loading}
                  className={`py-4 rounded-xl mt-6 ${
                    loading ? 'bg-gray-300' : 'bg-blue-600'
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white text-center font-semibold text-lg">
                      Sign Up
                    </Text>
                  )}
                </Pressable>

                {/* Login Link */}
                <Pressable
                  onPress={() => navigation.navigate('Login')}
                  className="mt-4"
                >
                  <Text className="text-center text-blue-600 font-medium">
                    Already have an account? Sign In
                  </Text>
                </Pressable>
              </View>

              {/* Footer */}
              <View className="mt-8">
                <Text className="text-center text-gray-500 text-sm">
                  By continuing, you agree to our Terms of Service and Privacy
                  Policy
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* OTP Verification Modal */}
        <Modal
          visible={showOtpModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCancelOtp}
        >
          <View className="flex-1 bg-black bg-opacity-50 justify-center items-center px-6">
            <View className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-lg">
              {/* Modal Header */}
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
                  <EnvelopeIcon size={24} color="#2563eb" />
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                  Email Verification
                </Text>
                <Text className="text-gray-600 text-center text-sm">
                  Enter the verification code sent to your email address
                </Text>
              </View>

              {/* OTP Input */}
              <View className="mb-6">
                <Text className="text-base font-medium text-gray-700 mb-3">
                  Verification Code
                </Text>
                <View className="flex-row items-center border-2 border-blue-200 rounded-xl px-4 py-3 bg-blue-50">
                  <TextInput
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="Enter 6-digit code"
                    className="flex-1 text-gray-800 text-base text-center font-mono"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    maxLength={6}
                    autoFocus={true}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <Pressable
                  onPress={() => handleConfirmOtp(otp)}
                  disabled={otpLoading || !otp.trim()}
                  className={`py-4 rounded-xl ${
                    otpLoading || !otp.trim() ? 'bg-gray-300' : 'bg-green-600'
                  }`}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white text-center font-semibold text-base">
                      Verify Code
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleCancelOtp}
                  disabled={otpLoading}
                  className="py-4 rounded-xl border border-gray-300 bg-white"
                >
                  <Text className="text-gray-700 text-center font-medium text-base">
                    Cancel
                  </Text>
                </Pressable>
              </View>

              {/* Help Text */}
              <Text className="text-xs text-gray-500 text-center mt-4">
                Didn't receive the code? Check your spam folder or try signing
                up again.
              </Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

export default SignupScreen;
