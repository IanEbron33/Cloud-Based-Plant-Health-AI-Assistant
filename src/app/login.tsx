import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = () => {
    router.replace('/(tabs)');
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 justify-center px-6 py-12">
        {/* Header Mascot Branding */}
        <View className="items-center mb-10">
          <View className="w-28 h-28 rounded-xl overflow-hidden shadow-md shadow-emerald-900/10 mb-4 bg-white items-center justify-center">
            <Image
              source={require('../../assets/images/mascot-logo.jpeg')}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          <Text className={`text-3xl font-bold font-fredoka ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Bugsok AI
          </Text>
          <Text className={`text-sm mt-1 font-medium font-fredoka tracking-wide ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            AI Powered Crop Health Tracker
          </Text>
        </View>

        {/* Form Container */}
        <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-100 shadow-sm'}`}>
          <Text className={`text-lg font-bold mb-6 font-fredoka ${isDark ? 'text-white' : 'text-stone-700'}`}>
            Log in to your Account
          </Text>

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
                className={`flex-1 py-4 px-2 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                style={{ fontSize: 13 }}
              />
            </View>
          </View>

          {/* Password input */}
          <View className="mb-3">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Password
            </Text>
            <View className={`flex-row items-center px-4 rounded-2xl border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'}`}>
              <Lock size={20} color="#78716c" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#a8a29e"
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                className={`flex-1 py-4 px-2 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                style={{ fontSize: 13 }}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                activeOpacity={0.7}
                className="p-1"
              >
                {isPasswordVisible ? (
                  <EyeOff size={20} color="#78716c" />
                ) : (
                  <Eye size={20} color="#78716c" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <View className="items-end mb-6">
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            activeOpacity={0.85}
            className="bg-emerald-600 hover:bg-emerald-700 py-4 rounded-2xl items-center shadow-lg shadow-emerald-600/10 mb-5"
          >
            <Text className="text-white text-base font-bold font-fredoka tracking-wide">
              Log In
            </Text>
          </TouchableOpacity>

          {/* Link to Register */}
          <View className="flex-row justify-center items-center">
            <Text className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text className="text-emerald-500 font-bold text-sm">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Disclaimer */}
        <View className="mt-8 items-center">
          <Text className={`text-xs text-center px-6 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
            An active internet connection is required to authenticate or register.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
