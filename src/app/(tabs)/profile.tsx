import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, useColorScheme, View, Image } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [profile, setProfile] = useState<{
    username: string;
    fullName: string;
    avatarUrl: string | null;
    memberSince: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const dbCardAnim = useRef(new Animated.Value(0)).current;
  const syncBtnAnim = useRef(new Animated.Value(0)).current;
  const settingsHeaderAnim = useRef(new Animated.Value(0)).current;
  const settingsListAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered screen entry transition
    Animated.stagger(70, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(dbCardAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(syncBtnAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(settingsHeaderAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(settingsListAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          const createdDate = new Date(user.created_at);
          const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
          const memberSinceStr = `Member since ${createdDate.toLocaleDateString('en-US', options)}`;

          setProfile({
            username: profileData.username || 'user',
            fullName: profileData.full_name || 'Anonymous User',
            avatarUrl: profileData.avatar_url || null,
            memberSince: memberSinceStr,
          });
        }
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (err) {
      router.replace('/login');
    }
  };

  const getTranslateY = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
    });
  };

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Top Profile Header */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [{ translateY: getTranslateY(headerAnim) }]
        }}
        className="pt-16 pb-8 px-6 rounded-b-[36px] items-center shadow-lg shadow-emerald-950/20 overflow-hidden"
      >
        <LinearGradient
          colors={['#047857', '#064e3b']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        {/* Avatar Card with layered ring treatment */}
        <View className="w-28 h-28 bg-emerald-900/30 rounded-full items-center justify-center mb-4 border border-emerald-700/20 shadow-inner overflow-hidden">
          {profile?.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              className="w-24 h-24 rounded-full border-4 border-white/20"
              resizeMode="cover"
            />
          ) : (
            <View className="w-24 h-24 bg-emerald-700 rounded-full items-center justify-center border-4 border-white/20">
              <Ionicons name="person" size={44} color="white" />
            </View>
          )}
        </View>

        <Text
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className="text-white text-2xl font-bold"
        >
          {isLoading ? 'Loading...' : profile?.fullName}
        </Text>
        <Text
          style={{ fontFamily: 'Fredoka_400Regular' }}
          className="text-emerald-300 text-sm mt-0.5"
        >
          {isLoading ? '' : `@${profile?.username}`}
        </Text>

        <View className="bg-emerald-900/60 border border-emerald-700/20 px-4 py-1.5 rounded-full mt-4">
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className="text-emerald-200 text-xs font-semibold"
          >
            {isLoading ? 'Checking membership...' : profile?.memberSince}
          </Text>
        </View>
      </Animated.View>

      <View className="px-6 py-6">
        {/* Database Mirror & Sync Status */}
        <Animated.Text
          style={{
            opacity: dbCardAnim,
            fontFamily: 'Fredoka_700Bold',
            transform: [{ translateY: getTranslateY(dbCardAnim) }]
          }}
          className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 px-1 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
        >
          Database Status
        </Animated.Text>

        <Animated.View
          style={{
            opacity: dbCardAnim,
            transform: [{ translateY: getTranslateY(dbCardAnim) }]
          }}
          className={`p-5 rounded-3xl mb-5 border ${isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-150 shadow-sm'
            }`}
        >
          {/* SQLite card block */}
          <View className="mb-4 pb-4.5 border-b border-stone-800/10 dark:border-stone-800/30">
            <View className="flex-row justify-between items-center mb-1.5">
              <View>
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
                >
                  Local Database (SQLite)
                </Text>
                <Text
                  style={{ fontFamily: 'Fredoka_400Regular' }}
                  className="text-stone-400 text-xs"
                >
                  Saved on your mobile device
                </Text>
              </View>
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
              >
                12 scans
              </Text>
            </View>
            <View className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <View className="w-full h-full bg-emerald-600 rounded-full" />
            </View>
          </View>

          {/* Supabase card block */}
          <View>
            <View className="flex-row justify-between items-center mb-1.5">
              <View>
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
                >
                  Cloud Database (Supabase)
                </Text>
                <Text
                  style={{ fontFamily: 'Fredoka_400Regular' }}
                  className="text-stone-400 text-xs"
                >
                  Backed up in the cloud
                </Text>
              </View>
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className="text-emerald-500 text-sm font-bold"
              >
                11 scans
              </Text>
            </View>
            <View className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <View className="h-full bg-emerald-500 rounded-full" style={{ width: '91.6%' }} />
            </View>
          </View>
        </Animated.View>

        {/* Sync Actions */}
        <Animated.View
          style={{
            opacity: syncBtnAnim,
            transform: [{ translateY: getTranslateY(syncBtnAnim) }]
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-emerald-600 py-4 rounded-2xl flex-row items-center justify-center mb-8 shadow-lg shadow-emerald-600/10"
          >
            <Ionicons name="sync" size={18} color="white" />
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className="text-white font-bold ml-2 text-sm"
            >
              Sync Queued Scans
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            opacity: settingsListAnim,
            transform: [{ translateY: getTranslateY(settingsListAnim) }]
          }}
          className={`rounded-[28px] overflow-hidden border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
            } mb-8`}
        >
          {/* Notifications setting item */}
          <TouchableOpacity
            className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-stone-800/30' : 'border-stone-100'}`}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Ionicons name="notifications-outline" size={18} color="#059669" />
              </View>
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className={`ml-3.5 text-sm ${isDark ? 'text-stone-200' : 'text-stone-700'}`}
              >
                Notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={isDark ? '#57534e' : '#a8a29e'} />
          </TouchableOpacity>

          {/* Privacy setting item */}
          <TouchableOpacity
            className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-stone-800/30' : 'border-stone-100'}`}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-blue-50/10' : 'bg-blue-50'}`}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#3b82f6" />
              </View>
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className={`ml-3.5 text-sm ${isDark ? 'text-stone-200' : 'text-stone-700'}`}
              >
                Privacy & Security
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={isDark ? '#57534e' : '#a8a29e'} />
          </TouchableOpacity>

          {/* Help setting item */}
          <TouchableOpacity
            className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-stone-800/30' : 'border-stone-100'}`}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-amber-50/10' : 'bg-amber-50'}`}>
                <Ionicons name="help-circle-outline" size={18} color="#d97706" />
              </View>
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className={`ml-3.5 text-sm ${isDark ? 'text-stone-200' : 'text-stone-700'}`}
              >
                Help & Support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={isDark ? '#57534e' : '#a8a29e'} />
          </TouchableOpacity>

          {/* Logout item */}
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-between p-4"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-red-50/10' : 'bg-red-50'}`}>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              </View>
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className="ml-3.5 text-sm text-red-500"
              >
                Log Out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ef4444" />
          </TouchableOpacity>
        </Animated.View>

        {/* Footer branding */}
        <Animated.View
          style={{ opacity: footerAnim }}
          className="items-center justify-center py-4"
        >
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className="text-stone-400 dark:text-stone-600 text-xs text-center"
          >
            Bugsok AI v1.0.0 · Made with 🌱
          </Text>
        </Animated.View>

      </View>
    </ScrollView>
  );
}
