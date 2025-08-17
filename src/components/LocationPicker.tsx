import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { ChevronDownIcon, MapPinIcon } from 'react-native-heroicons/outline';
import { useLocations } from '../hooks/useLibraries';
import { useStorage, STORAGE_KEYS } from '../hooks/useStorage';
import { Location } from '../types/api';

const { height } = Dimensions.get('window');

interface LocationPickerProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export default function LocationPicker({ 
  selectedLocation, 
  onLocationChange, 
  isVisible, 
  onClose 
}: LocationPickerProps) {
  const { data: locations, isLoading, error } = useLocations();
  const { setItem } = useStorage();
  const translateY = useSharedValue(-height);
  const opacity = useSharedValue(0);

  const uniqueCities = locations ? Array.from(new Set(locations.map(loc => loc.city))) : [];

  useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-height, { duration: 200 });
    }
  }, [isVisible]);

  const handleLocationSelect = (city: string) => {
    onLocationChange(city);
    setItem(STORAGE_KEYS.SELECTED_LOCATION, city);
    console.log('📍 Location saved to storage:', city);
    handleClose();
  };

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(-height, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderLocationItem = ({ item }: { item: string }) => (
    <Pressable
      onPress={() => handleLocationSelect(item)}
      className="flex-row items-center p-4 border-b border-gray-100"
      android_ripple={{ color: '#f3f4f6' }}
    >
      <MapPinIcon size={20} color="#6b7280" />
      <Text className="ml-3 text-base text-gray-800">{item}</Text>
    </Pressable>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Animated.View 
        className="flex-1 bg-black/50"
        style={backdropStyle}
      >
        <Pressable 
          className="flex-1" 
          onPress={handleClose}
        />
        <Animated.View 
          className="bg-white rounded-b-3xl max-h-96 shadow-2xl"
          style={[modalStyle, { position: 'absolute', top: 0, left: 0, right: 0 }]}
        >
          <View className="pt-12 pb-4 px-4 border-b border-gray-200">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-center text-gray-800">
                Select Location
              </Text>
            </View>
            </View>

            {isLoading ? (
              <View className="p-8 items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="mt-2 text-gray-600">Loading locations...</Text>
              </View>
            ) : error ? (
              <View className="p-8 items-center">
                <Text className="text-red-500">Failed to load locations</Text>
              </View>
            ) : (
              <FlatList
                data={uniqueCities}
                renderItem={renderLocationItem}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
              />
            )}

            <Pressable
              onPress={handleClose}
              className="p-4 border-t border-gray-200"
              android_ripple={{ color: '#f3f4f6' }}
            >
              <Text className="text-center text-gray-600 font-medium">Cancel</Text>
            </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}