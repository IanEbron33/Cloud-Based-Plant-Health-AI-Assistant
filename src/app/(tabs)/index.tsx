import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, TouchableOpacity, useColorScheme, View } from 'react-native';
import { FredokaText as Text } from '@/components/themed-text';
import { useAuth } from '../../context/AuthContext';
import { fetchUserScans, fetchScanStats, LocalScanRow } from '../../services/scan.service';
import { DAILY_TIPS } from '../../constants/tips';

// Reusable card component to encapsulate press scale animations cleanly
function ScanCard({ scan, index, isDark, onPress }: { scan: LocalScanRow; index: number; isDark: boolean; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 350,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const getSeverityColors = (severity: string) => {
    if (severity === 'High') return { barColor: 'bg-red-500', badgeBg: 'bg-red-500/10', text: 'text-red-500' };
    if (severity === 'Moderate') return { barColor: 'bg-orange-500', badgeBg: 'bg-orange-500/10', text: 'text-orange-500' };
    if (severity === 'Low') return { barColor: 'bg-yellow-500', badgeBg: 'bg-yellow-500/10', text: 'text-yellow-500' };
    return { barColor: 'bg-emerald-500', badgeBg: 'bg-emerald-500/10', text: 'text-emerald-500' };
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const { barColor, badgeBg, text: textStyle } = getSeverityColors(scan.severity);
  const displayImage = scan.cloud_image_url || scan.local_image_path || 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400';

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: slideAnim,
        transform: [{ translateY }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={0.9}
        className={`flex-row p-4 rounded-3xl items-center border ${
          isDark ? 'bg-stone-900 border-stone-880' : 'bg-white border-stone-100 shadow-sm'
        }`}
        style={{ marginBottom: 12 }}
      >
        {/* Crop Image */}
        <View className="w-16 h-16 bg-stone-200 rounded-2xl overflow-hidden mr-4">
          <Image
            source={{ uri: displayImage }}
            className="w-full h-full object-cover"
          />
        </View>

        {/* Details */}
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'} flex-1 mr-2`}
              numberOfLines={1}
            >
              {scan.crop_name}
            </Text>
            <Text
              style={{ fontFamily: 'Fredoka_400Regular' }}
              className={`text-[10px] ${isDark ? 'text-stone-500' : 'text-stone-400'}`}
            >
              {formatDate(scan.created_at)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mt-1">
            <Text
              style={{ fontFamily: 'Fredoka_400Regular' }}
              className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'} flex-1 mr-2`}
              numberOfLines={1}
            >
              {scan.condition_name}
            </Text>
            {/* Severity Badge */}
            <View className={`px-2 py-0.5 rounded-full ${badgeBg}`}>
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className={`text-[9px] font-bold ${textStyle}`}
                numberOfLines={1}
              >
                {scan.severity === 'None' ? 'Healthy' : scan.severity}
              </Text>
            </View>
          </View>

          {/* Health Progress Mini Bar */}
          <View className="mt-2.5 w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
            <View
              style={{ width: `${scan.health_score}%` }}
              className={`h-full rounded-full ${barColor}`}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const { user, profile } = useAuth();
  const [recentScans, setRecentScans] = useState<LocalScanRow[]>([]);
  const [stats, setStats] = useState({ total: 0, infected: 0, synced: 0 });
  const [highestSeverity, setHighestSeverity] = useState<'None' | 'Low' | 'Moderate' | 'High'>('None');
  const [greetingIndex, setGreetingIndex] = useState(0);

  // Animated values for entrance animations
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const mascotScaleAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const sectionHeaderAnim = useRef(new Animated.Value(0)).current;
  const tipAnim = useRef(new Animated.Value(0)).current;

  // Load data from local SQLite DB
  const loadDatabaseData = () => {
    if (!user) return;
    const scans = fetchUserScans(user.id);
    setRecentScans(scans.slice(0, 3));
    const counts = fetchScanStats(user.id);
    setStats(counts);

    // Compute highest severity of active infected scans
    const activeInfected = scans.filter(s => s.severity !== 'None');
    if (activeInfected.length === 0) {
      setHighestSeverity('None');
    } else {
      const severities = activeInfected.map(s => s.severity);
      if (severities.includes('High')) {
        setHighestSeverity('High');
      } else if (severities.includes('Moderate')) {
        setHighestSeverity('Moderate');
      } else {
        setHighestSeverity('Low');
      }
    }

    // Set a stable random index for greeting pools on focus
    setGreetingIndex(Math.floor(Math.random() * 4));
  };

  // Reload SQLite data whenever the screen gains navigation focus
  useEffect(() => {
    loadDatabaseData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadDatabaseData();
    });
    return unsubscribe;
  }, [navigation, user]);

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
      Animated.timing(tipAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ];

    Animated.stagger(80, animations).start();
  }, []);

  // Helper to interpolate translate Y
  const getTranslateY = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 0],
    });
  };

  const displayName = profile?.full_name || 'Grower';

  // Dynamically calculate time-of-day greeting
  const getTimeOfDayGreeting = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return 'Good Morning';
    if (hours >= 12 && hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  };
  const timeOfDayGreeting = getTimeOfDayGreeting();

  // State-based categorized greeting pools (4 items each)
  const healthyGreetings = [
    "All your plants are looking healthy! Keep up the good work.",
    "Good news! 0 infected plants found. Let's keep our garden thriving!",
    "All clear! Your crops are in top shape. Bugsok is happy to see them grow!",
    "Beautiful day! Your plant companions are shining and pest-free today."
  ];

  const warningGreetings = [
    "I noticed a few mild symptoms in your scans. We should keep an eye on them.",
    `We have ${stats.infected} crops showing warning signs. Let's check their care tips.`,
    "We spotted some leaf issues. Let's make sure they get the right organic treatment.",
    "Some plants need a bit of attention. Let's review the active warning cases."
  ];

  const criticalGreetings = [
    "Oh no! We have critical plant infections. Let's look at the treatment options immediately!",
    "A scan shows severe damage. We must take action now to save the crop!",
    "High severity infection detected. Check the recommended organic remedies right away.",
    "Bugsok is worried! Some plants have severe symptoms. Let's treat them before they spread."
  ];

  // Select active pool based on highestSeverity
  let greetingPool = healthyGreetings;
  if (highestSeverity === 'High') {
    greetingPool = criticalGreetings;
  } else if (highestSeverity === 'Moderate' || highestSeverity === 'Low') {
    greetingPool = warningGreetings;
  }

  const mascotSpeechBubbleText = greetingPool[greetingIndex] || greetingPool[0];

  // Select mascot image based on highestSeverity (Option C placeholder mapping)
  let mascotSource;
  if (highestSeverity === 'High') {
    mascotSource = require('../../../assets/images/mascot-worried.png');
  } else if (highestSeverity === 'Moderate' || highestSeverity === 'Low') {
    mascotSource = require('../../../assets/images/mascot-concerned.png');
  } else {
    mascotSource = require('../../../assets/images/mascot-transparent.png');
  }

  // Get day of the year to index the daily tip
  const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const dayOfYear = getDayOfYear();
  const dailyTip = DAILY_TIPS[dayOfYear % DAILY_TIPS.length];

  const renderTipText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const clean = part.slice(2, -2);
        return (
          <Text
            key={idx}
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className="text-emerald-600 dark:text-emerald-400 font-bold"
          >
            {clean}
          </Text>
        );
      }
      return part;
    });
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
              source={mascotSource}
              style={{ width: 205, height: 245, resizeMode: 'contain' }}
            />
          </Animated.View>

          {/* Speech Bubble */}
          <View className="bg-emerald-600 dark:bg-emerald-700 p-4 rounded-2xl rounded-bl-none shadow-sm shadow-emerald-800/10">
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className="text-white text-base font-bold"
            >
              {timeOfDayGreeting}, {displayName}!
            </Text>
            <Text
              style={{ fontFamily: 'Fredoka_400Regular' }}
              className="text-emerald-100 text-xs mt-1 leading-5"
            >
              {mascotSpeechBubbleText}
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
            {stats.total}
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
            {stats.infected}
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
            {stats.synced}
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
            {recentScans.length > 0 ? (
              recentScans.map((scan, index) => (
                <ScanCard
                  key={scan.id}
                  scan={scan}
                  index={index}
                  isDark={isDark}
                  onPress={() => router.push({ pathname: '/scan-results', params: { id: scan.id } })}
                />
              ))
            ) : (
              <View className="py-12 items-center justify-center border border-dashed border-stone-200 dark:border-stone-800 rounded-3xl bg-white dark:bg-stone-900">
                <Ionicons name="leaf-outline" size={32} color={isDark ? '#57534e' : '#a8a29e'} />
                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-400 text-xs mt-2">
                  No Scans Found
                </Text>
                <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-400 text-[10px] mt-0.5">
                  Tap 'Scan your Crops' above to run your first analysis.
                </Text>
              </View>
            )}
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
            {renderTipText(dailyTip)}
          </Text>
        </Animated.View>

      </View>
      {/* Spacer to prevent overlapping with floating Tab Bar */}
      <View style={{ height: 110 }} />
    </ScrollView>
  );
}
