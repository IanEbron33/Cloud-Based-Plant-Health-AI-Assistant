import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [birthdate, setBirthdate] = useState('1990-01-01');

  const handleRegister = () => {
    // For Phase 1 UI, direct navigation to tabs
    router.replace('/(tabs)');
  };

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }} 
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
    >
      <View className="flex-1 justify-center px-6 py-10">
        {/* Header Branding */}
        <View className="items-center mb-6">
          <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Gumawa ng Account
          </Text>
          <Text className={`text-sm mt-1 text-center ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
            Magsimula sa iyong pag-aalaga ng mga pananim
          </Text>
        </View>

        {/* Form Container */}
        <View className={`p-6 rounded-3xl ${isDark ? 'bg-stone-900 border border-stone-800' : 'bg-white shadow-sm border border-stone-100'}`}>
          
          {/* Full Name input */}
          <View className="mb-4">
            <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Buong Pangalan (Full Name)
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Ionicons name="person-outline" size={20} color="#78716c" />
              <TextInput
                value={fullName}
                onChangeText={fullName => setFullName(fullName)}
                placeholder="Juan Dela Cruz"
                placeholderTextColor="#a8a29e"
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
              />
            </View>
          </View>

          {/* Username input */}
          <View className="mb-4">
            <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Username
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Ionicons name="at-outline" size={20} color="#78716c" />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="juan_delacruz"
                placeholderTextColor="#a8a29e"
                autoCapitalize="none"
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
              />
            </View>
          </View>

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
                placeholder="email@example.com"
                placeholderTextColor="#a8a29e"
                keyboardType="email-address"
                autoCapitalize="none"
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
              />
            </View>
          </View>

          {/* Password input */}
          <View className="mb-4">
            <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Password
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Ionicons name="lock-closed-outline" size={20} color="#78716c" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="gumawa ng password..."
                placeholderTextColor="#a8a29e"
                secureTextEntry
                autoCapitalize="none"
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
              />
            </View>
          </View>

          {/* Gender selection */}
          <View className="mb-4">
            <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Kasarian (Gender)
            </Text>
            <View className="flex-row space-x-2 justify-between">
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-1 py-3 items-center rounded-2xl border ${
                    gender === g
                      ? 'bg-emerald-600 border-emerald-600'
                      : isDark
                      ? 'bg-stone-950 border-stone-800'
                      : 'bg-stone-50 border-stone-200'
                  }`}
                  style={{ marginRight: g !== 'Other' ? 8 : 0 }}
                >
                  <Text className={`font-semibold ${gender === g ? 'text-white' : isDark ? 'text-stone-400' : 'text-stone-700'}`}>
                    {g === 'Male' ? 'Lalaki' : g === 'Female' ? 'Babae' : 'Iba pa'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Birthdate selection */}
          <View className="mb-6">
            <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Kapanganakan (Birthdate: YYYY-MM-DD)
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Ionicons name="calendar-outline" size={20} color="#78716c" />
              <TextInput
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#a8a29e"
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
              />
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity 
            onPress={handleRegister}
            activeOpacity={0.8}
            className="bg-emerald-600 hover:bg-emerald-700 py-4 rounded-2xl items-center shadow-lg shadow-emerald-600/10 mb-4"
          >
            <Text className="text-white text-base font-bold">
              Gumawa ng Account
            </Text>
          </TouchableOpacity>

          {/* Link to Login */}
          <View className="flex-row justify-center items-center mt-2">
            <Text className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
              May account ka na?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-emerald-500 font-bold text-sm">
                Mag-login dito
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
