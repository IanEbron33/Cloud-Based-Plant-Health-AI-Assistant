import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Mail, Lock, Calendar } from 'lucide-react-native';

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
    router.replace('/(tabs)');
  };

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }} 
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 justify-center px-6 py-10">
        {/* Header Branding */}
        <View className="items-center mb-6">
          <Text className={`text-2xl font-bold font-fredoka ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Create Account
          </Text>
          <Text className={`text-sm mt-1 text-center font-medium ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
            Join Bugsok AI to track and maintain your crop health
          </Text>
        </View>

        {/* Form Container */}
        <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-100 shadow-sm'}`}>
          
          {/* Full Name input */}
          <View className="mb-4">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Full Name
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <User size={20} color="#78716c" />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#a8a29e"
                className={`flex-1 py-4 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                style={{ fontSize: 16 }}
              />
            </View>
          </View>

          {/* Username input */}
          <View className="mb-4">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Username
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <User size={20} color="#78716c" />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor="#a8a29e"
                autoCapitalize="none"
                className={`flex-1 py-4 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                style={{ fontSize: 16 }}
              />
            </View>
          </View>

          {/* Email input */}
          <View className="mb-4">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Email Address
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Mail size={20} color="#78716c" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#a8a29e"
                keyboardType="email-address"
                autoCapitalize="none"
                className={`flex-1 py-4 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                style={{ fontSize: 16 }}
              />
            </View>
          </View>

          {/* Password input */}
          <View className="mb-4">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Password
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Lock size={20} color="#78716c" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor="#a8a29e"
                secureTextEntry
                autoCapitalize="none"
                className={`flex-1 py-4 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                style={{ fontSize: 16 }}
              />
            </View>
          </View>

          {/* Gender selection */}
          <View className="mb-4">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Gender
            </Text>
            <View className="flex-row justify-between">
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-1 py-3.5 items-center rounded-2xl border ${
                    gender === g
                      ? 'bg-emerald-600 border-emerald-600'
                      : isDark
                      ? 'bg-stone-950 border-stone-850'
                      : 'bg-stone-50 border-stone-200'
                  }`}
                  style={{ marginRight: g !== 'Other' ? 8 : 0 }}
                >
                  <Text className={`font-bold text-sm ${gender === g ? 'text-white' : isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Birthdate selection */}
          <View className="mb-6">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Birthdate (YYYY-MM-DD)
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Calendar size={20} color="#78716c" />
              <TextInput
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#a8a29e"
                className={`flex-1 py-4 px-3 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                style={{ fontSize: 16 }}
              />
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity 
            onPress={handleRegister}
            activeOpacity={0.85}
            className="bg-emerald-600 hover:bg-emerald-700 py-4 rounded-2xl items-center shadow-lg shadow-emerald-600/10 mb-4"
          >
            <Text className="text-white text-base font-bold font-fredoka tracking-wide">
              Sign Up
            </Text>
          </TouchableOpacity>

          {/* Link to Login */}
          <View className="flex-row justify-center items-center mt-2">
            <Text className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-emerald-500 font-bold text-sm">
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
