// src/hooks/useStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useStorage = () => {
  const setItem = async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      console.log(`💾 Stored ${key}:`, value);
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  const getItem = async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      const result = jsonValue ? JSON.parse(jsonValue) : null;
      console.log(`📱 Retrieved ${key}:`, result);
      return result;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  };

  const removeItem = async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Removed ${key} from storage`);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  };

  const clear = async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
      console.log('🧹 Cleared all storage');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  return {
    setItem,
    getItem,
    removeItem,
    clear,
  };
};

// Storage keys
export const STORAGE_KEYS = {
  SELECTED_LOCATION: 'selected_location',
  SELECTED_LIBRARY: 'selected_library',
  CURRENT_USER: 'current_user',
  ALL_USERS: 'all_users',
  BOOKING_HISTORY: 'booking_history',
  FAVORITES: 'favorites',
} as const;