import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StatusBar,
  Dimensions,
} from 'react-native';
import { MagnifyingGlassIcon, Bars3Icon } from 'react-native-heroicons/outline';
import { useLibraries } from '../hooks/useLibraries';
import { useStorage, STORAGE_KEYS } from '../hooks/useStorage';
import LocationPicker from '../components/LocationPicker';
import LocationButton from '../components/LocationButton';
import ProfileButton from '../components/ProfileButton';
import LibraryCard from '../components/LibraryCard';
import { Library } from '../types/api';
import { HomeScreenProps } from '../types/navigation';

const { height } = Dimensions.get('window');

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const { getItem, setItem } = useStorage();

  // Load user data and saved location on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoadingUser(true);

        // Load current user from storage
        const userData = await getItem(STORAGE_KEYS.CURRENT_USER);
        setCurrentUser(userData);
        console.log('User data loaded in HomeScreen :', userData);

        // Load saved location and selected library from storage
        const savedLocation = await getItem(STORAGE_KEYS.SELECTED_LOCATION);
        if (savedLocation) {
          setSelectedLocation(savedLocation);
        }

        // Load selected library from storage
        const savedLibrary = await getItem(STORAGE_KEYS.SELECTED_LIBRARY);
        if (savedLibrary) {
          setSelectedLibrary(savedLibrary);
          console.log('📚 Saved library loaded:', savedLibrary.libraryName);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserData();
  }, []); // Empty dependency array - runs only once on mount

  // Create user object for ProfileButton - MOVED OUTSIDE useEffect
  const user = currentUser
    ? {
        name: currentUser.firstName || 'User',
        profileImage: null,
      }
    : null;

  console.log("User sending to profile component :", user);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useLibraries(selectedLocation, !!selectedLocation);

  const libraries =
    data?.pages.flatMap(page => (page as { data: Library[] }).data) || [];
  console.log('Libraries: ', libraries);

  // Filter libraries based on search query
  const filteredLibraries = libraries.filter(
    library =>
      library.libraryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      library.area?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleLibraryPress = (library: Library) => {
    // Save selected library to AsyncStorage
    setItem(STORAGE_KEYS.SELECTED_LIBRARY, library);
    setSelectedLibrary(library);
    console.log('📚 Library saved to storage:', library.libraryName);
    
    navigation.navigate('LibraryDetails', { libraryId: library.id });
  };

  const handleBookNow = (library: Library) => {
    // Save selected library to AsyncStorage
    setItem(STORAGE_KEYS.SELECTED_LIBRARY, library);
    setSelectedLibrary(library);
    
    navigation.navigate('Booking', { library });
  };

  const handleProfilePress = () => {
    console.log("User sending to profile component :", currentUser);
    if (currentUser) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('Login');
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderLibraryItem = ({ item }: { item: Library }) => (
    <LibraryCard
      library={item}
      onPress={() => handleLibraryPress(item)}
      onBookNow={() => handleBookNow(item)}
    />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Text className="text-lg font-medium text-gray-600 mb-2">
        {!selectedLocation
          ? 'Select a location to view libraries'
          : 'No libraries found'}
      </Text>
      <Text className="text-sm text-gray-500 text-center px-8">
        {!selectedLocation
          ? 'Choose your preferred location from the dropdown above'
          : 'Try selecting a different location or check back later'}
      </Text>
    </View>
  );

  // Show loading state while fetching user data
  if (isLoadingUser) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-2 text-gray-600">Loading...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header with Location and Profile */}
        <View className="flex-row justify-between items-center px-4 pt-8 pb-4 bg-gray-50">
          <LocationButton
            selectedLocation={selectedLocation}
            onPress={() => setShowLocationPicker(true)}
          />
          <ProfileButton user={user || undefined} onPress={handleProfilePress} />
        </View>

        <View className="px-4">
          {/* Header */}
          <View className="mb-4">
            <Text className="text-3xl font-bold text-gray-900 mb-1">
              {currentUser
                ? `Hi ${currentUser.firstName || 'User'}!`
                : 'Find Libraries'}
            </Text>
            <Text className="text-gray-600 text-base">
              {selectedLibrary 
                ? `Last visited: ${selectedLibrary.libraryName}`
                : 'Discover the perfect study space near you'}
            </Text>
          </View>

          {/* Search Bar */}
          {selectedLocation && (
            <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 shadow-sm">
              <MagnifyingGlassIcon size={20} color="#6b7280" />
              <TextInput
                placeholder="Search libraries..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}
        </View>

        {/* Libraries List */}
        {selectedLocation ? (
          <FlatList
            data={filteredLibraries}
            renderItem={renderLibraryItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={!isLoading ? renderEmptyState : null}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={['#3b82f6']}
              />
            }
          />
        ) : (
          renderEmptyState()
        )}

        {/* Loading State */}
        {isLoading && selectedLocation && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-2 text-gray-600">Loading libraries...</Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-red-500 text-center mb-2">
              Failed to load libraries
            </Text>
            <Text className="text-gray-600 text-center text-sm">
              Please check your connection and try again
            </Text>
          </View>
        )}

        {/* Location Picker Modal */}
        <LocationPicker
          selectedLocation={selectedLocation}
          onLocationChange={location => {
            setSelectedLocation(location);
            setShowLocationPicker(false);
          }}
          isVisible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
        />
      </SafeAreaView>
    </>
  );
}
