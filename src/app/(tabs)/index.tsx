import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Mock data for recent scans
  const recentScans = [
    { id: '1', crop: 'Eggplant', condition: 'Bacterial Wilt', severity: 'High', date: 'Just now', health: 15, image: 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?w=400' },
    { id: '2', crop: 'Tomato', condition: 'Tomato Leaf Curl', severity: 'Moderate', date: 'Yesterday', health: 45, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400' },
    { id: '3', crop: 'Chili', condition: 'Healthy', severity: 'None', date: '3 days ago', health: 100, image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400' },
  ];

  // Animated values for entrance animations
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const mascotScaleAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const sectionHeaderAnim = useRef(new Animated.Value(0)).current;
  const scanAnims = useRef(recentScans.map(() => new Animated.Value(0))).current;
  const tipAnim = useRef(new Animated.Value(0)).current;

  // Spring scale animated values for scan cards press feedback
  const scaleAnims = useRef(recentScans.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Staggered entrance animation sequence
    const animations = [
      Animated.timing(bannerAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(mascotScaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(ctaAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(sectionHeaderAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      ...scanAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        })
      ),
      Animated.timing(tipAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ];

    Animated.stagger(80, animations).start();
  }, []);

  // Helper to animate card scale on press
  const handlePressIn = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePressOut = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  // Helper to interpolate translate Y
  const getTranslateY = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 0],
    });
  };

  // Color helper for health bar matching condition severity
  const getSeverityColors = (health: number) => {
    if (health >= 70) return { barColor: 'bg-emerald-500', badgeBg: 'bg-emerald-500/10', text: 'text-emerald-500' };
    if (health >= 30) return { barColor: 'bg-orange-500', badgeBg: 'bg-orange-500/10', text: 'text-orange-500' };
    return { barColor: 'bg-red-500', badgeBg: 'bg-red-500/10', text: 'text-red-500' };
  };

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Brand & Profile Top Bar */}
      <Animated.View
        style={{
          opacity: bannerAnim,
          transform: [{ translateY: getTranslateY(bannerAnim) }]
        }}
        className="pt-14 px-6 flex-row justify-between items-center"
      >
        <Text
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-emerald-800'}`}
        >
          Bugsok AI
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          className={`w-11 h-11 rounded-2xl items-center justify-center border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
            }`}
        >
          <Ionicons name="person" size={18} color={isDark ? '#a8a29e' : '#059669'} />
        </TouchableOpacity>
      </Animated.View>

      {/* Mascot Highlight Card */}
      <Animated.View
        style={{
          opacity: bannerAnim,
          transform: [{ translateY: getTranslateY(bannerAnim) }]
        }}
        className="px-6 mt-4"
      >
        <View
          className="relative rounded-3xl border border-stone-100 pr-4 py-5 pl-[125px] min-h-[140px] justify-center bg-white shadow-sm"
        >
          {/* Mascot Image positioned absolutely on the left, flush with the bottom */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: 125,
              height: 160,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transform: [{ scale: mascotScaleAnim }],
            }}
          >
            <Image
              source={require('../../../assets/images/mascot-transparent.png')}
              style={{ width: 205, height: 245, resizeMode: 'contain' }}
            />
          </Animated.View>

          {/* Speech Bubble */}
          <View className="bg-emerald-600 dark:bg-emerald-700 p-4 rounded-2xl rounded-bl-none shadow-sm shadow-emerald-800/10">
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className="text-white text-base font-bold"
            >
              Hello, Juan!
            </Text>
            <Text
              style={{ fontFamily: 'Fredoka_400Regular' }}
              className="text-emerald-100 text-xs mt-1 leading-5"
            >
              You have 3 infected plants in your recent scans. Let's analyze them.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats Bento Grid Row */}
      <Animated.View
        style={{
          opacity: statsAnim,
          transform: [{ translateY: getTranslateY(statsAnim) }]
        }}
        className="flex-row space-x-3 justify-between px-6 mt-4"
      >
        <View
          className={`flex-1 p-4 rounded-2xl items-center border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
            }`}
          style={{ marginRight: 8 }}
        >
          <View className="w-10 h-10 rounded-full bg-emerald-400/15 items-center justify-center mb-1">
            <Ionicons name="scan-outline" size={20} color="#34d399" />
          </View>
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-lg font-bold mt-0.5 ${isDark ? 'text-white' : 'text-stone-900'}`}
          >
            12
          </Text>
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className={`text-[9px] uppercase font-semibold mt-0.5 text-center ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
          >
            Total Scans
          </Text>
        </View>

        <View
          className={`flex-1 p-4 rounded-2xl items-center border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
            }`}
          style={{ marginRight: 8 }}
        >
          <View className="w-10 h-10 rounded-full bg-red-400/15 items-center justify-center mb-1">
            <Ionicons name="alert-circle-outline" size={20} color="#f87171" />
          </View>
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-lg font-bold mt-0.5 ${isDark ? 'text-white' : 'text-stone-900'}`}
          >
            3
          </Text>
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className={`text-[9px] uppercase font-semibold mt-0.5 text-center ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
          >
            Infected
          </Text>
        </View>

        <View
          className={`flex-1 p-4 rounded-2xl items-center border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
            }`}
        >
          <View className="w-10 h-10 rounded-full bg-blue-400/15 items-center justify-center mb-1">
            <Ionicons name="cloud-done-outline" size={20} color="#60a5fa" />
          </View>
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-lg font-bold mt-0.5 ${isDark ? 'text-white' : 'text-stone-900'}`}
          >
            9
          </Text>
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className={`text-[9px] uppercase font-semibold mt-0.5 text-center ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
          >
            Synced
          </Text>
        </View>
      </Animated.View>

      {/* Main Body content */}
      <View className="px-6 pt-6">

        {/* Quick Scan Action Banner */}
        <Animated.View
          style={{
            opacity: ctaAnim,
            transform: [{ translateY: getTranslateY(ctaAnim) }]
          }}
        >
          <TouchableOpacity
            onPress={() => router.push('/scan')}
            activeOpacity={0.9}
            className="bg-emerald-600 rounded-3xl p-5 flex-row items-center justify-between mb-8 shadow-md shadow-emerald-700/10"
          >
            <View className="flex-1 pr-4">
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className="text-white text-lg font-bold"
              >
                Scan your Crops
              </Text>
              <Text
                style={{ fontFamily: 'Fredoka_400Regular' }}
                className="text-emerald-100 text-xs mt-1 leading-5"
              >
                Take a photo of a leaf to instantly assess its health using AI.
              </Text>
            </View>
            <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
              <Ionicons name="camera" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Scans Section */}
        <View className="mb-8">
          <Animated.View
            style={{ opacity: sectionHeaderAnim }}
            className="flex-row justify-between items-center mb-4"
          >
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className={`text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
            >
              Recent Scans
            </Text>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className="text-emerald-600 font-semibold text-sm"
              >
                View all
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Scans List */}
          <View className="space-y-4">
            {recentScans.map((scan, index) => {
              const { barColor, badgeBg, text: textStyle } = getSeverityColors(scan.health);
              return (
                <Animated.View
                  key={scan.id}
                  style={{
                    opacity: scanAnims[index],
                    transform: [
                      { translateY: getTranslateY(scanAnims[index]) },
                      { scale: scaleAnims[index] }
                    ]
                  }}
                >
                  <TouchableOpacity
                    onPressIn={() => handlePressIn(index)}
                    onPressOut={() => handlePressOut(index)}
                    onPress={() => router.push('/scan-results')}
                    activeOpacity={0.9}
                    className={`flex-row p-4 rounded-3xl items-center border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
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
                        <Text
                          style={{ fontFamily: 'Fredoka_700Bold' }}
                          className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
                        >
                          {scan.crop}
                        </Text>
                        <Text
                          style={{ fontFamily: 'Fredoka_400Regular' }}
                          className={`text-[10px] ${isDark ? 'text-stone-500' : 'text-stone-400'}`}
                        >
                          {scan.date}
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between mt-1">
                        <Text
                          style={{ fontFamily: 'Fredoka_400Regular' }}
                          className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'}`}
                        >
                          {scan.condition}
                        </Text>
                        {/* Severity Badge */}
                        <View className={`px-2 py-0.5 rounded-full ${badgeBg}`}>
                          <Text
                            style={{ fontFamily: 'Fredoka_700Bold' }}
                            className={`text-[9px] font-bold ${textStyle}`}
                          >
                            {scan.severity === 'High' ? 'High' : scan.severity === 'Moderate' ? 'Moderate' : 'Healthy'}
                          </Text>
                        </View>
                      </View>

                      {/* Health Progress Mini Bar */}
                      <View className="mt-2.5 w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                        <View
                          style={{ width: `${scan.health}%` }}
                          className={`h-full rounded-full ${barColor}`}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Daily Tip Card */}
        <Animated.View
          style={{
            opacity: tipAnim,
            transform: [{ translateY: getTranslateY(tipAnim) }]
          }}
          className={`p-5 rounded-3xl border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'}`}
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="bulb-outline" size={20} color="#059669" />
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className={`text-sm font-bold ml-2 ${isDark ? 'text-white' : 'text-stone-900'}`}
            >
              Tip of the Day
            </Text>
          </View>
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className={`text-sm leading-6 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}
          >
            To prevent <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-emerald-600 dark:text-emerald-400">Bacterial Wilt</Text> in eggplant and chili, avoid planting them in soil where tomatoes were recently harvested. Rotate crops with corn or legumes (peanuts, string beans) for 2 to 3 years.
          </Text>
        </Animated.View>

      </View>
    </ScrollView>
  );
}
