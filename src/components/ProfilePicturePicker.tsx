import React from 'react';
import { View, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { FredokaText as Text } from './themed-text';
import { Pencil, ImagePlus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

interface ProfilePicturePickerProps {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
}

export default function ProfilePicturePicker({
  imageUri,
  onImageSelected,
}: ProfilePicturePickerProps) {
  const requestPermission = async (type: 'camera' | 'gallery') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to take a profile photo.'
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Gallery access is needed to choose a profile photo.'
        );
        return false;
      }
    }
    return true;
  };

  const launchCamera = async () => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const launchGallery = async () => {
    const hasPermission = await requestPermission('gallery');
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const handlePress = () => {
    if (Platform.OS === 'web') {
      // Web doesn't support Alert.alert with buttons, go directly to gallery
      launchGallery();
      return;
    }

    Alert.alert(
      'Profile Photo',
      'Choose how to add your profile photo',
      [
        { text: 'Take Photo', onPress: launchCamera },
        { text: 'Choose from Gallery', onPress: launchGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={{
          width: 140,
          height: 140,
          borderRadius: 70,
          overflow: 'hidden',
          backgroundColor: '#f5f5f4', // stone-100
          borderWidth: 3,
          borderColor: '#059669', // emerald-600
          alignItems: 'center',
          justifyContent: 'center',
          borderStyle: 'dashed',
        }}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ImagePlus size={26} color="#059669" />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#78716c', // stone-500
                textAlign: 'center',
              }}
            >
              Tap to upload
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Edit badge when image is selected */}
      {imageUri && (
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            bottom: 12,
            right: '50%',
            marginRight: -70,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#059669',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: '#ffffff',
          }}
        >
          <Pencil size={16} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Helper text */}
      <Text
        style={{
          marginTop: 16,
          fontSize: 14,
          color: '#78716c',
          textAlign: 'center',
          paddingHorizontal: 24,
          lineHeight: 20,
        }}
      >
        Add a profile photo to personalize your account
      </Text>
    </View>
  );
}
