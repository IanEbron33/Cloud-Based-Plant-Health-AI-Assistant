import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, useColorScheme, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'sick', label: 'Infected' },
  { key: 'unsynced', label: 'Unsynced' },
];

export default function HistoryScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'healthy' | 'sick' | 'unsynced'>('all');

  // Mock list of scans with local/sync statuses
  const historyScans = [
    { id: '1', crop: 'Eggplant', condition: 'Bacterial Wilt', severity: 'High', date: 'June 12, 2026 - 5:24 PM', synced: true, health: 15, image: 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?w=400' },
    { id: '2', crop: 'Tomato', condition: 'Tomato Leaf Curl', severity: 'Moderate', date: 'June 11, 2026 - 9:43 AM', synced: true, health: 45, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400' },
    { id: '3', crop: 'Chili', condition: 'Healthy', severity: 'None', date: 'June 10, 2026 - 2:15 PM', synced: true, health: 100, image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400' },
    { id: '4', crop: 'Squash', condition: 'Powdery Mildew', severity: 'Low', date: 'June 09, 2026 - 11:30 AM', synced: false, health: 65, image: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=400' }, // Offline queued
    { id: '5', crop: 'Onion', condition: 'Purple Blotch', severity: 'Moderate', date: 'June 05, 2026 - 4:08 PM', synced: true, health: 50, image: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400' },
  ];

  // Animated values for entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const chipsAnim = useRef(new Animated.Value(0)).current;
  const syncAnim = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  // Track scale anims for card press feedback mapping by id
  const scaleAnims = useRef<Record<string, Animated.Value>>({}).current;
  historyScans.forEach((scan) => {
    if (!scaleAnims[scan.id]) {
      scaleAnims[scan.id] = new Animated.Value(1);
    }
  });

  useEffect(() => {
    // Run staggered entry sequence on load
    Animated.stagger(80, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(chipsAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(syncAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Soft fade on updates to filters/search
  useEffect(() => {
    listOpacity.setValue(0.3);
    Animated.timing(listOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [selectedFilter, searchQuery]);

  const handlePressIn = (id: string) => {
    Animated.spring(scaleAnims[id], {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePressOut = (id: string) => {
    Animated.spring(scaleAnims[id], {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const getTranslateY = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
    });
  };

  const getSeverityColors = (health: number) => {
    if (health >= 70) return { barColor: 'bg-emerald-500', badgeBg: 'bg-emerald-500/10', text: 'text-emerald-500' };
    if (health >= 30) return { barColor: 'bg-orange-500', badgeBg: 'bg-orange-500/10', text: 'text-orange-500' };
    return { barColor: 'bg-red-500', badgeBg: 'bg-red-500/10', text: 'text-red-500' };
  };

  // Filter and Search logic
  const filteredScans = historyScans.filter((scan) => {
    const matchesSearch =
      scan.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.condition.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'healthy') return scan.condition === 'Healthy';
    if (selectedFilter === 'sick') return scan.condition !== 'Healthy';
    if (selectedFilter === 'unsynced') return !scan.synced;
    return true;
  });

  return (
    <View className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'} px-6 pt-14`}>
      {/* Header */}
      <Animated.View 
        style={{ opacity: headerAnim, transform: [{ translateY: getTranslateY(headerAnim) }] }}
        className="mb-6"
      >
        <Text 
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
        >
          Diagnosis History
        </Text>
        <Text 
          style={{ fontFamily: 'Fredoka_400Regular' }}
          className={`text-xs mt-1 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
        >
          Records of your past plant health diagnostics
        </Text>
      </Animated.View>

      {/* Search Input Bar */}
      <Animated.View 
        style={{ opacity: searchAnim, transform: [{ translateY: getTranslateY(searchAnim) }] }}
        className={`flex-row items-center px-4 py-2 rounded-2xl mb-5 border ${
          isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-200 shadow-sm'
        }`}
      >
        <Ionicons name="search-outline" size={20} color="#78716c" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search crops or diseases..."
          placeholderTextColor="#a8a29e"
          style={{ fontFamily: 'Fredoka_400Regular' }}
          className={`flex-1 ml-2 text-sm ${isDark ? 'text-white' : 'text-stone-900'} py-2`}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#78716c" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Scrollable Filter Chips */}
      <Animated.View style={{ opacity: chipsAnim, transform: [{ translateY: getTranslateY(chipsAnim) }] }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mb-5"
          contentContainerStyle={{ paddingRight: 24, gap: 8 }}
        >
          {FILTERS.map((f) => {
            const isSelected = selectedFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setSelectedFilter(f.key as any)}
                activeOpacity={0.8}
                className={`px-4 py-2 rounded-full border ${
                  isSelected 
                    ? 'bg-emerald-600 border-emerald-600' 
                    : isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'
                }`}
                style={{ marginRight: 6 }}
              >
                <Text 
                  style={{ fontFamily: isSelected ? 'Fredoka_700Bold' : 'Fredoka_400Regular' }}
                  className={`text-xs ${isSelected ? 'text-white' : isDark ? 'text-stone-300' : 'text-stone-600'}`}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Sync Summary Alert */}
      <Animated.View 
        style={{
          opacity: syncAnim,
          transform: [{ translateY: getTranslateY(syncAnim) }]
        }}
        className={`border px-4 py-3 rounded-2xl flex-row items-center justify-between mb-5 ${
          isDark 
            ? 'bg-amber-950/20 border-amber-900/30' 
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <View className="flex-row items-center">
          <Ionicons name="cloud-upload" size={18} color="#d97706" />
          <Text 
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className={`text-xs font-semibold ml-2 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}
          >
            1 scan is waiting to sync (offline)
          </Text>
        </View>
        <TouchableOpacity className="bg-amber-600 px-3 py-1.5 rounded-lg active:opacity-90">
          <Text 
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className="text-white text-[10px] font-bold"
          >
            Sync Now
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Scans List Scroll view */}
      <Animated.ScrollView 
        style={{ opacity: listOpacity }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {filteredScans.length > 0 ? (
          filteredScans.map((scan) => {
            const { barColor, badgeBg, text: textStyle } = getSeverityColors(scan.health);
            return (
              <Animated.View
                key={scan.id}
                style={{
                  transform: [{ scale: scaleAnims[scan.id] || 1 }]
                }}
              >
                <TouchableOpacity
                  onPressIn={() => handlePressIn(scan.id)}
                  onPressOut={() => handlePressOut(scan.id)}
                  onPress={() => router.push('/scan-results')}
                  activeOpacity={0.9}
                  className={`flex-row p-4 rounded-3xl items-center border ${
                    isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
                  }`}
                  style={{ marginBottom: 12 }}
                >
                  {/* Image */}
                  <View className="w-16 h-16 bg-stone-250 rounded-2xl overflow-hidden mr-4">
                    <Image 
                      source={{ uri: scan.image }} 
                      className="w-full h-full object-cover" 
                    />
                  </View>

                  {/* Text metadata */}
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <Text 
                        style={{ fontFamily: 'Fredoka_700Bold' }}
                        className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
                      >
                        {scan.crop}
                      </Text>
                      
                      {/* Synced vs Offline Badge */}
                      <View className="flex-row items-center">
                        {scan.synced ? (
                          <Ionicons name="cloud-done-outline" size={16} color="#60a5fa" />
                        ) : (
                          <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" />
                        )}
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between mt-1">
                      <Text 
                        style={{ fontFamily: 'Fredoka_400Regular' }}
                        className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'}`}
                      >
                        {scan.condition}
                      </Text>
                      
                      {/* Health percent */}
                      <Text 
                        style={{ fontFamily: 'Fredoka_700Bold' }}
                        className={`text-xs font-bold ${textStyle}`}
                      >
                        {scan.health}% Health
                      </Text>
                    </View>

                    {/* Health mini progress bar */}
                    <View className="mt-2.5 w-full bg-stone-100 dark:bg-stone-850 h-1 rounded-full overflow-hidden">
                      <View 
                        style={{ width: `${scan.health}%` }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </View>

                    {/* Date */}
                    <Text 
                      style={{ fontFamily: 'Fredoka_400Regular' }}
                      className={`text-[9px] mt-2 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}
                    >
                      {scan.date}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        ) : (
          <View className="items-center justify-center py-20 px-6">
            <View className="w-20 h-20 rounded-full bg-stone-100 dark:bg-stone-900 items-center justify-center mb-4">
              <Ionicons name="leaf-outline" size={40} color={isDark ? '#57534e' : '#a8a29e'} />
            </View>
            <Text 
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-stone-800'}`}
            >
              No Scans Found
            </Text>
            <Text 
              style={{ fontFamily: 'Fredoka_400Regular' }}
              className="text-xs text-center text-stone-400 mt-1.5 max-w-[220px] leading-5"
            >
              Try searching for another keyword or changing filters to view your history scans.
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}
