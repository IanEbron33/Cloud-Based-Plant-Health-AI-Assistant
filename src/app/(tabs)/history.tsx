import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');

  // Mock list of scans with local/sync statuses
  const historyScans = [
    { id: '1', crop: 'Talong', condition: 'Bacterial Wilt', severity: 'High', date: 'June 12, 2026 - 5:24 PM', synced: true, health: 15, image: 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?w=400' },
    { id: '2', crop: 'Kamatis', condition: 'Tomato Leaf Curl', severity: 'Moderate', date: 'June 11, 2026 - 9:43 AM', synced: true, health: 45, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400' },
    { id: '3', crop: 'Sili', condition: 'Healthy', severity: 'None', date: 'June 10, 2026 - 2:15 PM', synced: true, health: 100, image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400' },
    { id: '4', crop: 'Kalabasa', condition: 'Powdery Mildew', severity: 'Low', date: 'June 09, 2026 - 11:30 AM', synced: false, health: 65, image: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=400' }, // Offline queued
    { id: '5', crop: 'Sibuyas', condition: 'Purple Blotch', severity: 'Moderate', date: 'June 05, 2026 - 4:08 PM', synced: true, health: 50, image: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400' },
  ];

  const filteredScans = historyScans.filter(scan => 
    scan.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scan.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'} px-6 pt-14`}>
      
      {/* Header */}
      <View className="mb-6">
        <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
          Kasaysayan ng Pagsusuri
        </Text>
        <Text className={`text-xs mt-1 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
          Talaan ng iyong mga nakaraang plant health diagnostics
        </Text>
      </View>

      {/* Search Input Bar */}
      <View className={`flex-row items-center px-4 py-2 rounded-2xl mb-6 border ${
        isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-200 shadow-sm'
      }`}>
        <Ionicons name="search-outline" size={20} color="#78716c" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Maghanap ng halaman o sakit..."
          placeholderTextColor="#a8a29e"
          className={`flex-1 ml-2 text-sm ${isDark ? 'text-white' : 'text-stone-900'}`}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#78716c" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sync Summary Alert */}
      <View className="bg-emerald-950/20 border border-emerald-850 px-4 py-3 rounded-2xl flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <Ionicons name="cloud-upload" size={18} color="#34d399" />
          <Text className="text-emerald-400 text-xs font-semibold ml-2">
            1 scan ang naghihintay ng sync (offline)
          </Text>
        </View>
        <TouchableOpacity className="bg-emerald-600 px-3 py-1 rounded-lg">
          <Text className="text-white text-[10px] font-bold">I-sync</Text>
        </TouchableOpacity>
      </View>

      {/* Scans List Scroll view */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {filteredScans.length > 0 ? (
          filteredScans.map((scan) => (
            <TouchableOpacity
              key={scan.id}
              onPress={() => router.push('/scan-results')}
              activeOpacity={0.85}
              className={`flex-row p-4 rounded-3xl items-center border ${
                isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
              }`}
              style={{ marginBottom: 12 }}
            >
              {/* Image */}
              <View className="w-16 h-16 bg-stone-250 rounded-2xl overflow-hidden mr-4">
                <Image 
                  source={{ uri: scan.image }} 
                  className="w-full h-full object-cover" 
                />
              </View>

              {/* Text metadata */}
              <View className="flex-1">
                <View className="flex-row justify-between items-start">
                  <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                    {scan.crop}
                  </Text>
                  
                  {/* Synced vs Offline Badge */}
                  <View className="flex-row items-center">
                    {scan.synced ? (
                      <Ionicons name="cloud-done-outline" size={16} color="#60a5fa" />
                    ) : (
                      <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" />
                    )}
                  </View>
                </View>

                <View className="flex-row items-center justify-between mt-1">
                  <Text className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                    {scan.condition}
                  </Text>
                  
                  {/* Health percent */}
                  <Text className={`text-xs font-bold ${
                    scan.health > 70 ? 'text-emerald-500' : scan.health > 30 ? 'text-orange-500' : 'text-red-500'
                  }`}>
                    {scan.health}% Health
                  </Text>
                </View>

                {/* Date */}
                <Text className={`text-[10px] mt-1.5 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                  {scan.date}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center justify-center py-20">
            <Ionicons name="search" size={48} color={isDark ? '#292524' : '#e7e5e4'} />
            <Text className={`text-sm mt-3 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
              Walang nahanap na scan.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
