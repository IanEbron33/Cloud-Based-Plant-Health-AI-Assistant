import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Mock data for recent scans
  const recentScans = [
    { id: '1', crop: 'Talong', condition: 'Bacterial Wilt', severity: 'High', date: 'Kani-kanina lang', health: 15, image: 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?w=400' },
    { id: '2', crop: 'Kamatis', condition: 'Tomato Leaf Curl', severity: 'Moderate', date: 'Kahapon', health: 45, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400' },
    { id: '3', crop: 'Sili', condition: 'Healthy', severity: 'None', date: '3 araw ang nakalipas', health: 100, image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400' },
  ];

  return (
    <ScrollView 
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Top Banner / Greeting */}
      <View className="bg-emerald-800 pt-14 pb-8 px-6 rounded-b-[36px] shadow-lg shadow-emerald-950/20">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              Maligayang Pagbabalik!
            </Text>
            <Text className="text-white text-2xl font-bold mt-1">
              Kamusta, Juan! 👋
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/profile')}
            className="w-12 h-12 bg-emerald-700/60 rounded-2xl items-center justify-center border border-emerald-600/30"
          >
            <Ionicons name="person" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Stats Bento Grid Row */}
        <View className="flex-row space-x-3 justify-between">
          <View className="flex-1 bg-emerald-900/50 border border-emerald-700/20 p-4 rounded-2xl items-center" style={{ marginRight: 8 }}>
            <Ionicons name="scan-outline" size={24} color="#34d399" />
            <Text className="text-white text-lg font-bold mt-1">12</Text>
            <Text className="text-emerald-300 text-[10px] uppercase font-semibold mt-0.5">Kabuuang Scan</Text>
          </View>
          <View className="flex-1 bg-emerald-900/50 border border-emerald-700/20 p-4 rounded-2xl items-center" style={{ marginRight: 8 }}>
            <Ionicons name="alert-circle-outline" size={24} color="#f87171" />
            <Text className="text-white text-lg font-bold mt-1">3</Text>
            <Text className="text-emerald-300 text-[10px] uppercase font-semibold mt-0.5">May Sakit</Text>
          </View>
          <View className="flex-1 bg-emerald-900/50 border border-emerald-700/20 p-4 rounded-2xl items-center">
            <Ionicons name="cloud-done-outline" size={24} color="#60a5fa" />
            <Text className="text-white text-lg font-bold mt-1">9</Text>
            <Text className="text-emerald-300 text-[10px] uppercase font-semibold mt-0.5">Naka-Sync</Text>
          </View>
        </View>
      </View>

      {/* Main Body content */}
      <View className="px-6 py-6">
        
        {/* Quick Scan Action Banner */}
        <TouchableOpacity 
          onPress={() => router.push('/scan')}
          activeOpacity={0.9}
          className="bg-emerald-600 rounded-3xl p-5 flex-row items-center justify-between mb-8 shadow-md shadow-emerald-700/10"
        >
          <View className="flex-1 pr-4">
            <Text className="text-white text-lg font-bold">
              Suriin ang iyong Pananim
            </Text>
            <Text className="text-emerald-100 text-xs mt-1">
              Kumuha ng larawan ng dahon upang makita ang kalusugan nito gamit ang ating AI.
            </Text>
          </View>
          <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
            <Ionicons name="camera" size={24} color="white" />
          </View>
        </TouchableOpacity>

        {/* Recent Scans Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Mga Huling Scan
            </Text>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text className="text-emerald-600 font-semibold text-sm">Tingnan lahat</Text>
            </TouchableOpacity>
          </View>

          {/* Scans List */}
          <View className="space-y-4">
            {recentScans.map((scan) => (
              <TouchableOpacity
                key={scan.id}
                onPress={() => router.push('/scan-results')}
                activeOpacity={0.85}
                className={`flex-row p-4 rounded-3xl items-center border ${
                  isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
                }`}
                style={{ marginBottom: 12 }}
              >
                {/* Crop Mock Image */}
                <View className="w-16 h-16 bg-stone-200 rounded-2xl overflow-hidden mr-4">
                  <Image 
                    source={{ uri: scan.image }} 
                    className="w-full h-full object-cover" 
                  />
                </View>

                {/* Details */}
                <View className="flex-1">
                  <View className="flex-row justify-between items-center">
                    <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                      {scan.crop}
                    </Text>
                    <Text className={`text-xs ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                      {scan.date}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                      {scan.condition === 'Healthy' ? 'Healthy (Malusog)' : `${scan.condition}`}
                    </Text>
                    {/* Severity Badge */}
                    <View className={`px-2 py-0.5 rounded-full ${
                      scan.severity === 'High' ? 'bg-red-500/10' : scan.severity === 'Moderate' ? 'bg-orange-500/10' : 'bg-emerald-500/10'
                    }`}>
                      <Text className={`text-[10px] font-bold ${
                        scan.severity === 'High' ? 'text-red-500' : scan.severity === 'Moderate' ? 'text-orange-500' : 'text-emerald-500'
                      }`}>
                        {scan.severity === 'High' ? 'High' : scan.severity === 'Moderate' ? 'Moderate' : 'Healthy'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Tip Card */}
        <View className={`p-5 rounded-3xl border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'}`}>
          <View className="flex-row items-center mb-3">
            <Ionicons name="bulb-outline" size={20} color="#059669" />
            <Text className={`text-sm font-bold ml-2 ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Tip sa Araw na Ito
            </Text>
          </View>
          <Text className={`text-sm leading-6 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
            Upang maiwasan ang **Bacterial Wilt** sa talong at sili, huwag itanim ang mga ito sa lupang katataniman pa lamang ng kamatis. I-rotate ang pananim gamit ang mais o mga legumbre (mani, sitaw) sa loob ng 2 hanggang 3 taon.
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}
