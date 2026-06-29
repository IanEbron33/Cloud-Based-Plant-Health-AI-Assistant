import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Brain, Zap } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Dimensions, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { FredokaText as Text } from '@/components/themed-text';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useScan } from '../../context/ScanContext';
import { useToast } from '../../context/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScanScreen() {
  const router = useRouter();
  const { isScanning, startScan } = useScan();
  const { showToast } = useToast();

  const [permission, requestPermission] = useCameraPermissions();
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // State for AI Model Selection
  const [selectedModel, setSelectedModel] = useState<'flash' | 'deep'>('flash');

  // Shared value for sliding active background pill index (0 = flash, 1 = deep)
  const activeIndex = useSharedValue(0);

  useEffect(() => {
    activeIndex.value = selectedModel === 'flash' ? 0 : 1;
  }, [selectedModel]);



  // Dimensions math for sliding pill
  const togglePadding = 4;
  const toggleWidth = SCREEN_WIDTH - 48; // Screen padding is px-6 (24 * 2)
  const tabWidth = (toggleWidth - togglePadding * 2) / 2;

  // Animated sliding pill offset
  const slidingPillStyle = useAnimatedStyle(() => {
    const translateX = withTiming(activeIndex.value * tabWidth, {
      duration: 220,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    });
    return {
      transform: [{ translateX }],
    };
  });

  const handleGallery = async () => {
    if (isScanning) {
      router.push('/scan-results');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({
        type: 'warning',
        title: 'Permission Denied',
        message: 'Permission to access your gallery is required to select photos.',
        duration: 3000,
      });
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 5],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPreviewImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to select image from gallery.',
      });
    }
  };

  const handleCapture = async () => {
    if (isScanning) {
      router.push('/scan-results');
      return;
    }

    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        showToast({
          type: 'warning',
          title: 'Permission Denied',
          message: 'Camera permission is required to capture photos.',
          duration: 3000,
        });
        return;
      }
    }

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo && photo.uri) {
          setPreviewImageUri(photo.uri);
        }
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Capture Failed',
          message: 'Failed to capture photo from viewfinder.',
        });
      }
    }
  };

  const handleConfirm = () => {
    if (previewImageUri) {
      startScan(previewImageUri, selectedModel);
      setPreviewImageUri(null); // Clear preview state
      router.push('/scan-results');
    }
  };

  const handleCancelPreview = () => {
    setPreviewImageUri(null);
  };

  return (
    <View className="flex-1 bg-stone-50 px-6 pt-14 pb-[145px]">
      {/* AI Mode Label */}
      <Text className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 px-1">
        Choose AI Mode
      </Text>

      {/* Model Toggle Switch Container */}
      <View
        style={{ height: 48, padding: togglePadding }}
        className="flex-row rounded-[20px] mb-6 bg-stone-200/50 border border-stone-200 relative items-center"
      >
        {/* Sliding Pill Background */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: togglePadding,
              top: togglePadding,
              width: tabWidth,
              height: 48 - togglePadding * 2,
              borderRadius: 16,
              backgroundColor: '#059669', // bg-emerald-600
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            },
            slidingPillStyle,
          ]}
        />

        {/* Flash Mode Tab */}
        <TouchableOpacity
          onPress={() => setSelectedModel('flash')}
          activeOpacity={0.8}
          className="flex-1 flex-row justify-center items-center h-full z-10"
        >
          <Zap
            size={15}
            color={selectedModel === 'flash' ? '#ffffff' : '#78716c'}
            style={{ marginRight: 6 }}
          />
          <Text
            className={`font-semibold text-sm ${
              selectedModel === 'flash' ? 'text-white' : 'text-stone-600'
            }`}
          >
            Flash
          </Text>
        </TouchableOpacity>

        {/* Deep Think Tab */}
        <TouchableOpacity
          onPress={() => setSelectedModel('deep')}
          activeOpacity={0.8}
          className="flex-1 flex-row justify-center items-center h-full z-10"
        >
          <Brain
            size={15}
            color={selectedModel === 'deep' ? '#ffffff' : '#78716c'}
            style={{ marginRight: 6 }}
          />
          <Text
            className={`font-semibold text-sm ${
              selectedModel === 'deep' ? 'text-white' : 'text-stone-600'
            }`}
          >
            Deep Think
          </Text>
        </TouchableOpacity>
      </View>

      {/* Viewfinder Preview Viewport */}
      <View className="flex-1 justify-center items-center mb-6">
        <View className="relative w-full aspect-[4/5] rounded-[24px] overflow-hidden border bg-stone-200/20 border-stone-300 items-center justify-center">
          {isScanning ? (
            // Scanning in background indicator overlay
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/scan-results')}
              className="items-center justify-center p-6 w-full h-full"
            >
              <ActivityIndicator size="large" color="#059669" />
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className="text-stone-850 text-sm font-bold text-center mt-4 px-4"
              >
                Scan in Progress...
              </Text>
              <Text
                style={{ fontFamily: 'Fredoka_400Regular' }}
                className="text-stone-400 text-xs text-center mt-2 px-6"
              >
                An analysis is running in the background. Tap here to view the progress.
              </Text>
            </TouchableOpacity>
          ) : previewImageUri ? (
            // Preview selected image
            <Image
              source={{ uri: previewImageUri }}
              className="w-full h-full object-cover rounded-[23px]"
            />
          ) : permission === null ? (
            // Permissions Loading
            <ActivityIndicator size="large" color="#059669" />
          ) : !permission.granted ? (
            // Permissions Request Frame
            <View className="items-center justify-center p-6">
              <Ionicons name="camera-outline" size={48} color="#a8a29e" />
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className="text-stone-700 text-sm font-bold text-center mt-3"
              >
                Camera Permission Required
              </Text>
              <Text
                style={{ fontFamily: 'Fredoka_400Regular' }}
                className="text-stone-400 text-xs text-center mt-1 px-4"
              >
                Bugsok AI needs access to your camera to capture plant leaves directly.
              </Text>
              <TouchableOpacity
                onPress={requestPermission}
                className="bg-emerald-600 px-5 py-2.5 rounded-xl mt-4 shadow-sm"
              >
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className="text-white text-xs font-bold"
                >
                  Grant Permission
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Live Camera Viewfinder feed
            <>
              <CameraView
                ref={cameraRef}
                style={{ width: '100%', height: '100%' }}
                facing="back"
              />
              {/* Overlay Corner brackets */}
              <View
                className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-emerald-600 rounded-tl-lg"
                style={{ zIndex: 10 }}
              />
              <View
                className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-emerald-600 rounded-tr-lg"
                style={{ zIndex: 10 }}
              />
              <View
                className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-emerald-600 rounded-bl-lg"
                style={{ zIndex: 10 }}
              />
              <View
                className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-emerald-600 rounded-br-lg"
                style={{ zIndex: 10 }}
              />

              {/* Mini connectivity warning */}
              <View
                className="absolute bottom-6 bg-emerald-600/90 px-4 py-1.5 rounded-full flex-row items-center shadow-sm"
                style={{ zIndex: 10 }}
              >
                <Ionicons name="wifi" size={13} color="#ffffff" />
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className="text-white text-[10px] font-bold ml-1.5"
                >
                  Online Active
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Bottom Buttons Action Bar */}
      {previewImageUri ? (
        // Preview State: Confirm & Cancel/Retake
        <View className="flex-row justify-between items-center w-full">
          <TouchableOpacity
            onPress={handleCancelPreview}
            className="flex-1 py-4 flex-row items-center justify-center rounded-2xl border bg-white border-stone-200 shadow-sm mr-3"
          >
            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
            <Text className="font-bold ml-2 text-xs text-red-500">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirm}
            className="flex-1 py-4 bg-emerald-600 flex-row items-center justify-center rounded-2xl shadow-lg shadow-emerald-600/15"
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="white" />
            <Text className="text-white font-bold ml-2 text-xs">Analyze Crop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Viewfinder State: Open Gallery & Capture Photo
        <View className="flex-row justify-between items-center w-full">
          <TouchableOpacity
            onPress={handleGallery}
            className="flex-1 py-4 flex-row items-center justify-center rounded-2xl border bg-white border-stone-200 shadow-sm mr-3"
          >
            <Ionicons name="images-outline" size={18} color="#57534e" />
            <Text className="font-bold ml-2 text-xs text-stone-700">Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCapture}
            className="flex-1 py-4 bg-emerald-600 flex-row items-center justify-center rounded-2xl shadow-lg shadow-emerald-600/15"
          >
            <Ionicons name="aperture" size={18} color="white" />
            <Text className="text-white font-bold ml-2 text-xs">Take Photo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
