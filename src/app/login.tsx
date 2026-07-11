import { FredokaText as Text } from '@/components/themed-text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { signIn, signInWithGoogle } = useAuth();
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error === 'Sign-in cancelled') {
          setIsLoading(false);
          return;
        }
        showToast({
          type: 'error',
          title: 'Google Login Failed',
          message: error,
        });
        setIsLoading(false);
        return;
      }
      
      await AsyncStorage.removeItem('login_cooldown_end');
      router.replace('/(tabs)');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Google Login Error',
        message: err.message || 'An unexpected error occurred.',
      });
      setIsLoading(false);
    }
  };

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
                className={`flex-1 py-4 px-2 text-base font-fredoka ${isDark ? 'text-white' : 'text-stone-900'}`}
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
                className={`flex-1 py-4 px-2 text-base font-fredoka ${isDark ? 'text-white' : 'text-stone-900'}`}
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
            className={`py-4 rounded-2xl items-center shadow-lg mb-5 ${cooldownTime > 0
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

          {/* OR Divider */}
          <View className="flex-row items-center mb-5">
            <View className={`flex-1 h-[1px] ${isDark ? 'bg-stone-850' : 'bg-stone-200'}`} />
            <Text className={`mx-4 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
              OR
            </Text>
            <View className={`flex-1 h-[1px] ${isDark ? 'bg-stone-850' : 'bg-stone-200'}`} />
          </View>

          {/* Google Login Button */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isLoading || isToastVisible}
            activeOpacity={0.85}
            className={`flex-row items-center justify-center py-4 rounded-2xl border mb-5 ${
              isDark
                ? 'bg-stone-900 border-stone-800 active:bg-stone-850'
                : 'bg-white border-stone-200 active:bg-stone-50 shadow-sm'
            }`}
          >
            <Svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 10 }}>
              <Path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.87z"
              />
              <Path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.08 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.39 24 12 24z"
              />
              <Path
                fill="#FBBC05"
                d="M5.32 14.24A7.16 7.16 0 0 1 5 12c0-.79.13-1.57.32-2.34V6.51H1.21A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.21 5.39l4.11-3.15z"
              />
              <Path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.39 0 3.18 2.12 1.21 5.79l4.11 3.15c.94-2.85 3.57-4.96 6.68-4.96z"
              />
            </Svg>
            <Text className={`text-base font-bold font-fredoka tracking-wide ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
              Continue with Google
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
