import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // For Phase 1 UI, direct navigation to tabs
    router.replace('/(tabs)');
  };

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }} 
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
    >
      <View className="flex-1 justify-center px-6 py-12">
        {/* Header Branding */}
        <View className="items-center mb-10">
          <View className="bg-emerald-600 p-4 rounded-3xl mb-4 shadow-md shadow-emerald-900/20">
            <Ionicons name="leaf" size={42} color="white" />
          </View>
          <Text className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
            TanimLunas AI
          </Text>
          <Text className={`text-sm mt-1 text-center ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
            Cloud-Based Plant Health AI Assistant
          </Text>
        </View>

        {/* Form Container */}
        <View className={`p-6 rounded-3xl ${isDark ? 'bg-stone-900 border border-stone-800' : 'bg-white shadow-sm border border-stone-100'}`}>
          <Text className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Mag-login sa iyong Account
          </Text>

          {/* Email input */}
          <View className="mb-4">
            <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Email Address
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Ionicons name="mail-outline" size={20} color="#78716c" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ilagay ang iyong email..."
                placeholderTextColor="#a8a29e"
                keyboardType="email-address"
                autoCapitalize="none"
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
              />
            </View>
          </View>

          {/* Password input */}
          <View className="mb-6">
            <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Password
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Ionicons name="lock-closed-outline" size={20} color="#78716c" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="ilagay ang iyong password..."
                placeholderTextColor="#a8a29e"
                secureTextEntry
                autoCapitalize="none"
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
              />
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            onPress={handleLogin}
            activeOpacity={0.8}
            className="bg-emerald-600 hover:bg-emerald-700 py-4 rounded-2xl items-center shadow-lg shadow-emerald-600/10 mb-4"
          >
            <Text className="text-white text-base font-bold">
              Mag-login
            </Text>
          </TouchableOpacity>

          {/* Link to Register */}
          <View className="flex-row justify-center items-center mt-2">
            <Text className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
              Walang account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text className="text-emerald-500 font-bold text-sm">
                Gumawa ng Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Disclaimer */}
        <View className="mt-8 items-center">
          <Text className={`text-xs text-center px-6 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
            Kailangan ng internet koneksyon para sa pag-sign-in o pag-register.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
