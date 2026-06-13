import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const handleLogout = () => {
    // Go back to login screen
    router.replace('/login');
  };

  return (
    <ScrollView 
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Top Profile Header */}
      <View className="bg-emerald-800 pt-16 pb-8 px-6 rounded-b-[36px] items-center">
        {/* Avatar Card */}
        <View className="w-24 h-24 bg-emerald-700 rounded-full items-center justify-center mb-4 border-4 border-emerald-900/40">
          <Ionicons name="person" size={48} color="white" />
        </View>

        <Text className="text-white text-xl font-bold">
          Juan Dela Cruz
        </Text>
        <Text className="text-emerald-300 text-sm">
          @juan_delacruz
        </Text>

        <View className="bg-emerald-900/60 border border-emerald-700/20 px-3 py-1 rounded-full mt-3">
          <Text className="text-emerald-200 text-xs font-semibold">
            Miyembro simula Hunyo 2026
          </Text>
        </View>
      </View>

      <View className="px-6 py-6">
        {/* Database Mirror & Sync Status */}
        <Text className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
          Database Status
        </Text>
        <View className={`p-5 rounded-3xl mb-6 border ${
          isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-150 shadow-sm'
        }`}>
          <View className="flex-row justify-between mb-4 pb-4 border-b border-stone-800/25">
            <View>
              <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Local Database (SQLite)
              </Text>
              <Text className="text-stone-500 text-xs mt-0.5">
                Naka-save sa iyong mobile device
              </Text>
            </View>
            <View className="items-end">
              <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                12 scans
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Cloud Database (Supabase)
              </Text>
              <Text className="text-stone-500 text-xs mt-0.5">
                Naka-back up sa cloud
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-emerald-500 text-base font-bold">
                11 scans
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Actions */}
        <TouchableOpacity 
          activeOpacity={0.8}
          className="bg-emerald-600 py-4 rounded-2xl flex-row items-center justify-center mb-8 shadow-lg shadow-emerald-600/10"
        >
          <Ionicons name="sync" size={20} color="white" />
          <Text className="text-white font-bold ml-2 text-sm">
            I-sync ang mga Nakapilang Scans
          </Text>
        </TouchableOpacity>

        {/* Settings options list */}
        <Text className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
          Mga Opsyon
        </Text>

        <View className={`rounded-3xl overflow-hidden border ${
          isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
        }`}>
          <TouchableOpacity 
            className="flex-row items-center justify-between p-4 border-b border-stone-800/10"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color={isDark ? '#a8a29e' : '#57534e'} />
              <Text className={`font-semibold ml-3 text-sm ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
                Mga Abiso (Notifications)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716c" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center justify-between p-4 border-b border-stone-800/10"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#a8a29e' : '#57534e'} />
              <Text className={`font-semibold ml-3 text-sm ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
                Privacy at Seguridad
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716c" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center justify-between p-4 border-b border-stone-800/10"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="help-circle-outline" size={20} color={isDark ? '#a8a29e' : '#57534e'} />
              <Text className={`font-semibold ml-3 text-sm ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
                Tulong at Suporta
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716c" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLogout}
            className="flex-row items-center justify-between p-4"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text className="font-semibold ml-3 text-sm text-red-500">
                Mag-logout
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}
