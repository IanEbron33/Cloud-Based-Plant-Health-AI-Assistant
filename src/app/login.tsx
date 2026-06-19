import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { signIn } = useAuth();
  const { showToast, isVisible: isToastVisible } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);

  // Check for stored cooldown lock on mount
  useEffect(() => {
    const checkCooldown = async () => {
      try {
        const storedEnd = await AsyncStorage.getItem('login_cooldown_end');
        if (storedEnd) {
          const endTime = parseInt(storedEnd, 10);
          const now = Date.now();
          if (endTime > now) {
            const remaining = Math.ceil((endTime - now) / 1000);
            setCooldownTime(remaining);
          } else {
            // Expired, clear storage
            await AsyncStorage.removeItem('login_cooldown_end');
          }
        }
      } catch (err) {
        console.warn('Failed to load login cooldown state:', err);
      }
    };
    checkCooldown();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownTime <= 0) return;

    const timer = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          AsyncStorage.removeItem('login_cooldown_end').catch(console.warn);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownTime]);

  const handleLogin = async () => {
    if (cooldownTime > 0) {
      showToast({
        type: 'warning',
        title: 'Login Locked',
        message: `Too many failed attempts. Try again in ${cooldownTime} seconds.`,
      });
      return;
    }

    if (!email.trim() || !password.trim()) {
      showToast({
        type: 'error',
        title: 'Required Fields',
        message: 'Please enter your email and password.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          const cooldownDuration = 60; // 1 minute in seconds
          const cooldownEndTimestamp = Date.now() + cooldownDuration * 1000;
          await AsyncStorage.setItem('login_cooldown_end', cooldownEndTimestamp.toString());
          setCooldownTime(cooldownDuration);
          setFailedAttempts(0); // Reset attempts counter

          showToast({
            type: 'error',
            title: 'Account Locked',
            message: 'Too many failed login attempts. Locked for 1 minute.',
          });
        } else {
          showToast({
            type: 'error',
            title: 'Login Failed',
            message: `${error} (Attempt ${nextAttempts}/3)`,
          });
        }
        setIsLoading(false);
        return;
      }

      // Login success — clear lockout states
      setFailedAttempts(0);
      await AsyncStorage.removeItem('login_cooldown_end');

      router.replace('/(tabs)');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Login Error',
        message: err.message || 'An unexpected error occurred.',
      });
      setIsLoading(false);
    }
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
            <View className="flex-row items-center px-4 rounded-2xl border bg-stone-50 border-stone-200 dark:bg-stone-950 dark:border-stone-800">
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
            <View className="flex-row items-center px-4 rounded-2xl border bg-stone-50 border-stone-200 dark:bg-stone-950 dark:border-stone-800">
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
            <TouchableOpacity
              onPress={() => {
                console.log('Forgot Password pressed!');
                router.push('/forgot-password');
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-emerald-600">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading || isToastVisible || cooldownTime > 0}
            activeOpacity={0.85}
            className={`py-4 rounded-2xl items-center shadow-lg mb-5 ${
              cooldownTime > 0
                ? 'bg-stone-300 dark:bg-stone-800 shadow-none'
                : (isLoading || isToastVisible)
                ? 'bg-emerald-600/60 shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : cooldownTime > 0 ? (
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className={`text-base font-bold tracking-wide ${isDark ? 'text-stone-500' : 'text-stone-400'}`}
              >
                Locked ({cooldownTime}s)
              </Text>
            ) : (
              <Text className="text-white text-base font-bold font-fredoka tracking-wide">
                Log In
              </Text>
            )}
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
