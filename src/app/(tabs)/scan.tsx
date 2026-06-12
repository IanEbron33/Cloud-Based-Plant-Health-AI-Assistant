import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ScanScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // State for AI Model Selection
  // 'flash' represents ⚡ Flash (gemini-3.1-flash-lite)
  // 'deep' represents 🧠 Deep Thinking (gemma-4-31b)
  const [selectedModel, setSelectedModel] = useState<'flash' | 'deep'>('flash');

  const handleCapture = () => {
    // For Phase 1, clicking capture simulates a successful scan
    // and redirects to the detailed bento dashboard
    router.push('/scan-results');
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'} px-6 pt-14 pb-8`}>
      
      {/* Screen Header */}
      <View className="items-center mb-6">
        <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
          Suriin ang Pananim
        </Text>
        <Text className={`text-xs mt-1 text-center ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
          Kuhanan ng malinaw na larawan ang may sakit na dahon
        </Text>
      </View>

      {/* Model Toggle Switch (⚡ / 🧠) */}
      <View className={`flex-row p-1.5 rounded-2xl mb-6 ${isDark ? 'bg-stone-900 border border-stone-850' : 'bg-stone-200/60'}`}>
        <TouchableOpacity
          onPress={() => setSelectedModel('flash')}
          activeOpacity={0.8}
          className={`flex-1 flex-row py-3 justify-center items-center rounded-xl ${
            selectedModel === 'flash'
              ? 'bg-emerald-600 shadow-sm'
              : ''
          }`}
        >
          <Text className={`font-semibold mr-1.5 text-sm ${selectedModel === 'flash' ? 'text-white' : isDark ? 'text-stone-400' : 'text-stone-600'}`}>
            ⚡ Flash Mode
          </Text>
          <View className="bg-emerald-950/30 px-1.5 py-0.5 rounded">
            <Text className={`text-[9px] font-bold ${selectedModel === 'flash' ? 'text-emerald-200' : 'text-stone-500'}`}>Mabilis</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedModel('deep')}
          activeOpacity={0.8}
          className={`flex-1 flex-row py-3 justify-center items-center rounded-xl ${
            selectedModel === 'deep'
              ? 'bg-emerald-600 shadow-sm'
              : ''
          }`}
        >
          <Text className={`font-semibold mr-1.5 text-sm ${selectedModel === 'deep' ? 'text-white' : isDark ? 'text-stone-400' : 'text-stone-600'}`}>
            🧠 Deep Think
          </Text>
          <View className="bg-emerald-950/30 px-1.5 py-0.5 rounded">
            <Text className={`text-[9px] font-bold ${selectedModel === 'deep' ? 'text-emerald-200' : 'text-stone-500'}`}>Malalim</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Camera Preview Viewport Placeholder */}
      <View className="flex-1 justify-center items-center mb-6">
        <View 
          className={`relative w-full aspect-[4/5] rounded-[36px] overflow-hidden border-2 border-dashed ${
            isDark ? 'bg-stone-900 border-stone-850' : 'bg-stone-200/30 border-stone-300'
          } items-center justify-center`}
        >
          {/* Overlay Corner brackets */}
          <View className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-emerald-600 rounded-tl-lg" />
          <View className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-emerald-600 rounded-tr-lg" />
          <View className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-emerald-600 rounded-bl-lg" />
          <View className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-emerald-600 rounded-br-lg" />

          {/* Icon in Center */}
          <Ionicons name="leaf-outline" size={64} color={isDark ? '#292524' : '#d6d3d1'} />
          <Text className={`text-sm font-semibold mt-4 text-center px-8 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
            Igitna ang dahon ng halaman sa loob ng mga brackets.
          </Text>

          {/* Mini connectivity warning */}
          <View className="absolute bottom-6 bg-emerald-900/95 border border-emerald-700/20 px-4 py-2 rounded-full flex-row items-center">
            <Ionicons name="wifi" size={14} color="#34d399" />
            <Text className="text-white text-[11px] font-bold ml-1.5">
              Online Mode Aktibo
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row justify-between space-x-4">
        {/* Gallery button */}
        <TouchableOpacity 
          onPress={handleCapture}
          className={`flex-1 py-4 flex-row items-center justify-center rounded-2xl border ${
            isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200 shadow-sm'
          }`}
          style={{ marginRight: 12 }}
        >
          <Ionicons name="images-outline" size={20} color={isDark ? '#a8a29e' : '#57534e'} />
          <Text className={`font-bold ml-2 text-sm ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
            Mula Gallery
          </Text>
        </TouchableOpacity>

        {/* Capture button */}
        <TouchableOpacity 
          onPress={handleCapture}
          className="flex-[1.5] py-4 bg-emerald-600 flex-row items-center justify-center rounded-2xl shadow-lg shadow-emerald-600/10"
        >
          <Ionicons name="aperture" size={22} color="white" />
          <Text className="text-white font-bold ml-2 text-sm">
            Kumuha ng Larawan
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
