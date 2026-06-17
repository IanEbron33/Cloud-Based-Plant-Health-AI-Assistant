import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Brain, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScanScreen() {
  const router = useRouter();

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

  const handleCapture = () => {
    router.push('/scan-results');
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
          <Text className={`font-semibold text-sm ${selectedModel === 'flash' ? 'text-white' : 'text-stone-600'}`}>
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
          <Text className={`font-semibold text-sm ${selectedModel === 'deep' ? 'text-white' : 'text-stone-600'}`}>
            Deep Think
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera Preview Viewport Placeholder */}
      <View className="flex-1 justify-center items-center mb-6">
        <View
          className="relative w-full aspect-[4/5] rounded-[24px] overflow-hidden border bg-stone-200/20 border-stone-300 items-center justify-center"
        >
          {/* Overlay Corner brackets */}
          <View className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-emerald-600 rounded-tl-lg" />
          <View className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-emerald-600 rounded-tr-lg" />
          <View className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-emerald-600 rounded-bl-lg" />
          <View className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-emerald-600 rounded-br-lg" />

          {/* Icon in Center */}
          <Ionicons name="leaf-outline" size={56} color="#a8a29e" />
          <Text className="text-xs font-semibold mt-4 text-center px-8 text-stone-400">
            Igitna ang dahon ng halaman sa loob ng mga brackets.
          </Text>

          {/* Mini connectivity warning */}
          <View className="absolute bottom-6 bg-emerald-600/90 px-4 py-1.5 rounded-full flex-row items-center shadow-sm">
            <Ionicons name="wifi" size={13} color="#ffffff" />
            <Text className="text-white text-[10px] font-bold ml-1.5">
              Online Active
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row justify-between items-center w-full">
        {/* Gallery button */}
        <TouchableOpacity 
          onPress={handleCapture}
          className="flex-1 py-4 flex-row items-center justify-center rounded-2xl border bg-white border-stone-200 shadow-sm mr-3"
        >
          <Ionicons name="images-outline" size={18} color="#57534e" />
          <Text className="font-bold ml-2 text-xs text-stone-700">
            Gallery
          </Text>
        </TouchableOpacity>

        {/* Capture button */}
        <TouchableOpacity 
          onPress={handleCapture}
          className="flex-1 py-4 bg-emerald-600 flex-row items-center justify-center rounded-2xl shadow-lg shadow-emerald-600/15"
        >
          <Ionicons name="aperture" size={18} color="white" />
          <Text className="text-white font-bold ml-2 text-xs">
            Take Photo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
