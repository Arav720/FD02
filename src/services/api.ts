import axios from 'axios';
import { Location, LibrariesResponse, Library, BookingRequest, ReviewRequest } from '../types/api';

// API Configuration
const BASE_URL = 'http://10.0.2.2:3001/api'; // Android emulator
// const BASE_URL = 'http://localhost:3001/api'; // iOS simulator

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data,
      code: error.code
    });
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      console.error('🔥 Network Error - Check if backend is running on port 3001');
    }
    
    return Promise.reject(error);
  }
);

// API Services
export const libraryApi = {
  // Get all locations
  getLocations: async (): Promise<Location[]> => {
    try {
      const response = await api.get('/library/getLocations');
      return response.data;
    } catch (error) {
      console.error('getLocations error:', error);
      throw error;
    }
  },

  // Get libraries by city with pagination
  getLibraries: async (city: string, page = 1, limit = 10): Promise<LibrariesResponse> => {
    try {
      const response = await api.get(`/library?city=${encodeURIComponent(city)}&page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('getLibraries error:', error);
      throw error;
    }
  },

  // Get library by ID
  getLibraryById: async (id: string): Promise<Library> => {
    try {
      const response = await api.get(`/library/${id}`);
      return response.data;
    } catch (error) {
      console.error('getLibraryById error:', error);
      throw error;
    }
  },

  // Search libraries
  searchLibraries: async (params: {
    city?: string;
    state?: string;
    libraryName?: string;
    page?: number;
    limit?: number;
  }): Promise<LibrariesResponse> => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      const response = await api.get(`/library?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('searchLibraries error:', error);
      throw error;
    }
  },
};

// Booking API
export const bookingApi = {
  createBooking: async (booking: BookingRequest): Promise<{ success: boolean; data: any; message: string }> => {
    try {
      console.log('📝 Creating booking with data:', booking);
      const response = await api.post('/bookings', booking);
      console.log('✅ Booking created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Booking creation failed:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Booking failed');
      }
      throw new Error('Network error - please check your connection');
    }
  },

  getUserBookings: async (userId: string): Promise<any[]> => {
    try {
      // Mock data for now since endpoint doesn't exist
      await new Promise(resolve => setTimeout(resolve, 500));
      return [];
    } catch (error) {
      console.error('getUserBookings error:', error);
      throw error;
    }
  },
};

// Review API
export const reviewApi = {
  createReview: async (review: ReviewRequest): Promise<{ success: boolean; data: any; message: string }> => {
    try {
      console.log('📝 Creating review with data:', review);
      const response = await api.post('/reviews', review);
      console.log('✅ Review created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Review creation failed:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Review submission failed');
      }
      throw new Error('Network error - please check your connection');
    }
  },

  getReviewsByLibrary: async (libraryId: string): Promise<{ success: boolean; data: any[] }> => {
    try {
      const response = await api.get(`/reviews/library/${libraryId}`);
      return response.data;
    } catch (error) {
      console.error('getReviewsByLibrary error:', error);
      throw error;
    }
  },
};

export default api;

// Student API
export const studentApi = {
  createStudent: async (studentData: {
    cognitoId: string;
    username: string;
    email: string;
    password?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ success: boolean; data?: any; message: string }> => {
    try {
      console.log(' Creating student with data:', studentData);
      const response = await api.post('/students/createStudent', studentData);
      console.log('Student created successfully:', response.data);
      return { success: true, data: response.data, message: response.data.message || 'Student created successfully' };
    } catch (error: any) {
      console.error(' Student creation failed:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Student creation failed');
      }
      throw new Error('Network error - please check your connection');
    }
  },

  // Get student by cognitoId to verify existence
  getStudentByCognitoId: async (cognitoId: string): Promise<{ id: string; cognitoId: string; username: string; email: string }> => {
    try {
      console.log('🔍 Fetching student by cognitoId:', cognitoId);
      const response = await api.get(`/students/${cognitoId}`);
      console.log('✅ Student found:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Student not found:', error);
      if (error.response?.status === 404) {
        throw new Error('Student not found. Please login again.');
      }
      throw new Error('Failed to verify student');
    }
  },

  // Fix the API function return type and usage
getStudentByEmail: async (email: string): Promise<{
  id: string;
  cognitoId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
}> => {
  try {
    console.log(' Fetching student by email:', email);
    const response = await api.get(`/students/studentData/${email}`);
    console.log(' Student found by email:', response.data);
    return response.data; // This returns the actual student object
  } catch (error: any) {
    console.error(' Student not found by email:', error);
    if (error.response?.status === 404) {
      throw new Error('Student not found with this email. Please check your email or sign up.');
    }
    throw new Error('Failed to fetch student by email');
  }
},



};

// Seat API
export const seatApi = {
  // Get seats by library ID
  getSeatsByLibraryId: async (libraryId: string): Promise<Array<{
    id: string;
    seatNumber: number;
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
    currentAvailability: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  }>> => {
    try {
      console.log('🪑 Fetching seats for library:', libraryId);
      const response = await api.get(`/library/libraries/${libraryId}`);
      console.log('✅ Seats fetched:', response.data);
      return response.data.data.seats || [];
    } catch (error: any) {
      console.error('❌ Failed to fetch seats:', error);
      throw new Error('Failed to load seats');
    }
  },
};

// TimeSlot API
export const timeSlotApi = {
  // Get timeslots by library ID
  getTimeSlotsByLibraryId: async (libraryId: string): Promise<Array<{
    id: string;
    startTime: string;
    endTime: string;
    date: string;
    capacity: number;
    bookedCount: number;
    status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
    availableSpots: number;
    isBookable: boolean;
  }>> => {
    try {
      console.log('⏰ Fetching timeslots for library:', libraryId);
      const response = await api.get(`/timeslots/libraryId/${libraryId}`);
      console.log('✅ Timeslots fetched:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('❌ Failed to fetch timeslots:', error);
      throw new Error('Failed to load timeslots');
    }
  },
};


// Payment API
export const paymentApi = {
  // Create Razorpay order
  createOrder: async (orderData: {
    librarianId: string;
    studentId: string;
    amount: number;
    token?: string;
  }): Promise<{
    
    data: {
      orderId: string;
      amount: number;
      currency: string;
    };
    
  }> => {
    try {
      console.log('💳 Creating Razorpay order with data:', orderData);
      const response = await api.post('/payments/create-order', {
        librarianId: orderData.librarianId,
        studentId: orderData.studentId,
        amount: orderData.amount,
      });
      console.log('✅ Order created successfully:', response.data);
      return {
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Order creation failed:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Order creation failed');
      }
      throw new Error('Network error - please check your connection');
    }
  },

  // Confirm payment (webhook simulation)
  confirmPayment: async (paymentData: {
    event: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    student_id: string;
    librarianId: string;
    token?: string;
  }): Promise<{
    success: boolean;
    data?: any;
    message: string;
  }> => {
    try {
      console.log('Confirming payment with data:', paymentData);
      const response = await api.post('/payments/webhook', {
        event: paymentData.event,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        student_id: paymentData.student_id,
        librarianId: paymentData.librarianId,
      });
      console.log('✅ Payment confirmed successfully:', response.data);
      return {
        success: true,
        data: response.data,
        message: 'Payment confirmed successfully'
      };
    } catch (error: any) {
      console.error('❌ Payment confirmation failed:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Payment confirmation failed');
      }
      throw new Error('Network error - please check your connection');
    }
  },

  
};

// Updated handlePayment function using the new API structure
export const handlePaymentWithAPI = async (
  librarianId: string,
  studentId: string,
  amount: number,
  token: string,
  RAZORPAY_KEY: string,
  setLoading: (loading: boolean) => void,
  Alert: any,
  RazorpayCheckout: any
) => {
  try {
    setLoading(true);

    // 1. Create Razorpay order using the new API
    const orderResponse = await paymentApi.createOrder({
      librarianId,
      studentId,
      amount,
      token,
    });

    console.log("Order data:", orderResponse.data);

    // 2. Configure Razorpay options
    const options = {
      key: RAZORPAY_KEY,
      name: 'Focus Desk',
      description: 'Payment for Library Slot',
      image: '',
      order_id: orderResponse.data.orderId,
      currency: orderResponse.data.currency || 'INR',
      amount: orderResponse.data.amount,
      prefill: {
        name: 'Student X',
        email: 'studentX@test.com',
        contact: '9876543210',
      },
      theme: {
        color: '#3399cc',
      },
    };

    console.log("Razorpay options:", options);

    // 3. Open Razorpay checkout
    RazorpayCheckout.open(options)
      .then(async (paymentResult: any) => {
        // 4. Confirm payment using the new API
        await paymentApi.confirmPayment({
          event: 'payment.captured',
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
          student_id: studentId,
          librarianId: librarianId,
          token,
        });

        Alert.alert('Success', 'Payment Successful!');
      })
      .catch((error: any) => {
        console.log("Payment Failed:", error);
        Alert.alert('Payment Failed', error.description || 'Payment was cancelled');
      });
  } catch (err: any) {
    console.log("Payment Initiation Error:", err);
    Alert.alert('Error', err.message || 'Failed to initiate payment.');
  } finally {
    setLoading(false);
  }
};