import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeftIcon, CheckIcon } from 'react-native-heroicons/outline';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Library, LibraryPlan, TimeSlot } from '../types/api';
import { bookingApi, studentApi, timeSlotApi, paymentApi } from '../services/api';
import { useStorage, STORAGE_KEYS } from '../hooks/useStorage';
import { BookingScreenProps } from '../types/navigation';
import SeatSelectionGrid from '../components/SeatSelectionGrid';
import RazorpayCheckout from 'react-native-razorpay';

export default function EnhancedBookingScreen({ navigation, route }: BookingScreenProps) {
  const { library, selectedPlan: preSelectedPlan } = route.params;
  const [selectedPlan, setSelectedPlan] = useState<LibraryPlan | null>(preSelectedPlan || null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string>('');
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { getItem } = useStorage();
  const queryClient = useQueryClient();
  const RAZORPAY_KEY = 'rzp_test_WOnh0XISrlnHjs';
  
  // Load current user from storage
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Load user data on component mount
  React.useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await getItem(STORAGE_KEYS.CURRENT_USER);
        console.log("userData from Booking : ", userData);
        setCurrentUser(userData);
        console.log('📱 Current user loaded in booking screen:', userData);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    loadUserData();
  }, []);

  // Fetch real timeslots from backend
  const { 
    data: timeSlots, 
    isLoading: isLoadingTimeSlots, 
    error: timeSlotsError 
  } = useQuery({
    queryKey: ['timeslots', library.id],
    queryFn: () => timeSlotApi.getTimeSlotsByLibraryId(library.id),
    enabled: !!library.id,
    staleTime: 30000, // 30 seconds
  });

  const handleSeatSelect = (seatId: string, seatNumber: number) => {
    setSelectedSeatId(seatId);
    setSelectedSeatNumber(seatNumber);
  };

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: (bookingData: any) => bookingApi.createBooking(bookingData),
    onSuccess: (data) => {
      console.log('✅ Booking created successfully:', data);
      Alert.alert(
        'Success!',
        'Your seat has been booked successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to bookings or home screen
              navigation.navigate('Home');
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      console.error('❌ Booking failed:', error);
      Alert.alert(
        'Booking Failed',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });

  const handlePaymentSuccess = async (paymentResult: any) => {
    try {
      console.log('🎯 Payment result received:', paymentResult);
      
      // Check if required payment fields are present
      if (!paymentResult.razorpay_order_id || !paymentResult.razorpay_payment_id) {
        throw new Error('Payment verification failed: Missing payment details');
      }

      // Confirm payment with backend
      const paymentConfirmData = {
        event: 'payment.captured',
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature || '', // Handle undefined signature
        student_id: currentUser.id,
        librarianId: library.id,
        token: currentUser.accessToken,
      };

      console.log('💳 Confirming payment with data:', paymentConfirmData);
      
      await paymentApi.confirmPayment(paymentConfirmData);

      // Create booking after successful payment confirmation
      const bookingData = {
        studentId: currentUser.id,
        libraryId: library.id,
        planId: selectedPlan!.id,
        timeSlotId: selectedTimeSlot!.id,
        seatId: selectedSeatId,
        amount: selectedPlan!.price,
        paymentId: paymentResult.razorpay_payment_id,
        orderId: paymentResult.razorpay_order_id,
        status: 'CONFIRMED',
      };

      console.log('📝 Creating booking with data:', bookingData);
      //await bookingMutation.mutateAsync(bookingData);

    } catch (error: any) {
      console.error('❌ Post-payment processing failed:', error);
      Alert.alert(
        'Payment Processing Error',
        error.message || 'There was an issue processing your payment. Please contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBookNowPress = async () => {
    // Validation checks
    if (isLoadingUser) {
      Alert.alert('Loading', 'Please wait while we verify your login status.');
      return;
    }

    console.log("current user in handle Book press", currentUser?.accessToken);
    
    if (!currentUser?.accessToken) {
      Alert.alert('Login Required', 'Please login to book a seat.', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }
    
    if (!selectedPlan || !selectedTimeSlot || !selectedSeatId) {
      Alert.alert(
        'Incomplete Selection', 
        'Please select a plan, time slot, and seat to proceed.'
      );
      return;
    }

    try {
      setIsProcessingPayment(true);

      // 1. Create Razorpay order
      console.log('💳 Creating Razorpay order...');
      const orderResponse = await paymentApi.createOrder({
        librarianId: library.id,
        studentId: currentUser.id,
        amount: selectedPlan.price,
        token: currentUser.accessToken,
      });

      console.log("✅ Order created:", orderResponse.data.data.amount);

      // 2. Configure Razorpay options
      const options = {
        key: RAZORPAY_KEY,
        name: 'Focus Desk',
        description: `${library.libraryName} - ${selectedPlan.planName}`,
        image: '',
        order_id: orderResponse.data.data.orderId,
        currency: orderResponse.data.data.currency || 'INR',
        amount: orderResponse.data.data.amount,
        prefill: {
          name: `${currentUser.firstName} ${currentUser.lastName}`,
          email: currentUser.email,
          contact: currentUser.phoneNumber?.replace('+91', '') || '',
        },
        theme: {
          color: '#3399cc',
        },
        notes: {
          libraryId: library.id,
          planId: selectedPlan.id,
          timeSlotId: selectedTimeSlot.id,
          seatId: selectedSeatId,
          studentId: currentUser.id,
        },
      };

      console.log("🎯 Opening Razorpay with options:", options);

      // 3. Open Razorpay checkout
      RazorpayCheckout.open(options)
        .then(async (paymentResult: any) => {
          console.log('💰 Payment successful:', paymentResult);
          
          // Validate payment result before proceeding
          if (paymentResult && paymentResult.razorpay_payment_id && paymentResult.razorpay_order_id) {
            await handlePaymentSuccess(paymentResult);
          } else {
            console.error('❌ Invalid payment result:', paymentResult);
            Alert.alert(
              'Payment Verification Failed',
              'Payment completed but verification failed. Please contact support.'
            );
          }
        })
        .catch((error: any) => {
          console.log("❌ Payment Failed:", error);
          
          if (error.code === 'PAYMENT_CANCELLED') {
            Alert.alert('Payment Cancelled', 'You cancelled the payment.');
          } else {
            Alert.alert(
              'Payment Failed', 
              error.description || error.message || 'Payment failed. Please try again.'
            );
          }
        });

    } catch (error: any) {
      console.error("❌ Payment Initiation Error:", error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to initiate payment. Please try again.'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderPlanSelection = () => (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-800 mb-3">
        Select Subscription Plan
      </Text>
      {library.plans.map((plan) => (
        <Pressable
          key={plan.id}
          onPress={() => setSelectedPlan(plan)}
          className={`p-4 rounded-lg border-2 mb-3 ${
            selectedPlan?.id === plan.id
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white'
          }`}
          android_ripple={{ color: '#f3f4f6' }}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-semibold text-gray-800">{plan.planName}</Text>
              <Text className="text-sm text-gray-600">
                {plan.hours} hours • {plan.days} days
              </Text>
              {plan.description && (
                <Text className="text-sm text-gray-500 mt-1">
                  {plan.description}
                </Text>
              )}
            </View>
            <View className="items-end">
              <Text className="text-lg font-bold text-blue-600">
                ₹{plan.price.toLocaleString()}
              </Text>
              {selectedPlan?.id === plan.id && (
                <CheckIcon size={20} color="#2563eb" />
              )}
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderTimeSlotSelection = () => (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-800 mb-3">
        Select Time Slot
      </Text>
      
      {isLoadingTimeSlots ? (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-2 text-gray-600">Loading time slots...</Text>
        </View>
      ) : timeSlotsError ? (
        <View className="items-center py-8">
          <Text className="text-red-500 mb-4">Failed to load time slots</Text>
          <Pressable
            onPress={() => queryClient.invalidateQueries({ queryKey: ['timeslots', library.id] })}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </Pressable>
        </View>
      ) : !timeSlots || timeSlots.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-gray-600">No time slots available</Text>
        </View>
      ) : (
      <View className="flex-row flex-wrap">
        {timeSlots.map((slot) => (
          <Pressable
            key={slot.id}
            onPress={() => slot.isBookable && setSelectedTimeSlot(slot)}
            disabled={!slot.isBookable}
            className={`p-3 rounded-lg border-2 mr-3 mb-3 min-w-24 ${
              selectedTimeSlot?.id === slot.id
                ? 'border-blue-600 bg-blue-50'
                : slot.isBookable
                ? 'border-gray-200 bg-white'
                : 'border-gray-200 bg-gray-100'
            }`}
            android_ripple={{ color: '#f3f4f6' }}
          >
            <Text
              className={`text-center font-medium ${
                slot.isBookable ? 'text-gray-800' : 'text-gray-400'
              }`}
            >
              {slot.startTime} - {slot.endTime}
            </Text>
            <Text className="text-xs text-center text-gray-500 mt-1">
              {slot.availableSpots} available
            </Text>
            {selectedTimeSlot?.id === slot.id && (
              <View className="absolute -top-1 -right-1">
                <CheckIcon size={16} color="#2563eb" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
      )}
    </View>
  );

  const renderBookingSummary = () => {
    if (!selectedPlan || !selectedTimeSlot || !selectedSeatId) return null;

    return (
      <View className="bg-gray-50 p-4 rounded-lg mb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Booking Summary
        </Text>
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Library:</Text>
            <Text className="font-medium text-gray-800">{library.libraryName}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Plan:</Text>
            <Text className="font-medium text-gray-800">{selectedPlan.planName}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Time:</Text>
            <Text className="font-medium text-gray-800">
              {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Seat:</Text>
            <Text className="font-medium text-gray-800">Seat {selectedSeatNumber}</Text>
          </View>
          <View className="border-t border-gray-200 pt-2 mt-2">
            <View className="flex-row justify-between">
              <Text className="text-lg font-semibold text-gray-800">Total:</Text>
              <Text className="text-lg font-bold text-blue-600">
                ₹{selectedPlan.price.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <Pressable
          onPress={() => navigation.goBack()}
          className="p-2 rounded-full mr-3"
          android_ripple={{ color: '#f3f4f6' }}
        >
          <ArrowLeftIcon size={24} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-800">Book Your Seat</Text>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Library Info */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-800">{library.libraryName}</Text>
          <Text className="text-gray-600">{library.address}</Text>
        </View>

        {renderPlanSelection()}
        {renderTimeSlotSelection()}
        
        {/* Seat Selection Grid */}
        <View className="mb-6">
          <SeatSelectionGrid
            libraryId={library.id}
            selectedTimeSlot={selectedTimeSlot}
            onSeatSelect={handleSeatSelect}
            selectedSeatId={selectedSeatId}
          />
        </View>

        {renderBookingSummary()}
      </ScrollView>

      {/* Book Button */}
      <View className="p-4 border-t border-gray-200">
        <Pressable
          onPress={handleBookNowPress}
          disabled={!selectedPlan || !selectedTimeSlot || !selectedSeatId || isProcessingPayment || bookingMutation.isPending || isLoadingUser}
          className={`py-4 rounded-lg ${
            selectedPlan && selectedTimeSlot && selectedSeatId && !isProcessingPayment && !bookingMutation.isPending && !isLoadingUser
              ? 'bg-blue-600'
              : 'bg-gray-300'
          }`}
          android_ripple={{ color: '#2563eb' }}
        >
          {(isProcessingPayment || bookingMutation.isPending || isLoadingUser) ? (
            <View className="flex-row justify-center items-center">
              <ActivityIndicator color="white" size="small" />
              <Text className="text-white font-semibold text-lg ml-2">
                {isLoadingUser ? 'Loading...' : isProcessingPayment ? 'Processing Payment...' : 'Creating Booking...'}
              </Text>
            </View>
          ) : (
            <Text className="text-white text-center font-semibold text-lg">
              Book Now - ₹{selectedPlan?.price.toLocaleString() || '0'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
