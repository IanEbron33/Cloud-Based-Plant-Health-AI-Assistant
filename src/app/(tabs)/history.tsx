import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, useColorScheme, Animated, ActivityIndicator } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { fetchUserScans, syncData, LocalScanRow } from '../../services/scan.service';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'sick', label: 'Infected' },
  { key: 'unsynced', label: 'Unsynced' },
];

function HistoryScanCard({ scan, onPress, isDark }: { scan: LocalScanRow; onPress: () => void; isDark: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' - ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const { barColor, text: textStyle } = getSeverityColors(scan.severity);
  const displayImage = scan.cloud_image_url || scan.local_image_path || 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={0.9}
        className={`flex-row p-4 rounded-3xl items-center border ${
          isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
        }`}
        style={{ marginBottom: 12 }}
      >
        {/* Image */}
        <View className="w-16 h-16 bg-stone-250 rounded-2xl overflow-hidden mr-4">
          <Image
            source={{ uri: displayImage }}
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
              {scan.crop_name}
            </Text>

            {/* Synced vs Offline Icon */}
            <View className="flex-row items-center">
              {scan.synced === 1 ? (
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
              {scan.condition_name}
            </Text>

            {/* Health percent */}
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className={`text-xs font-bold ${textStyle}`}
            >
              {scan.health_score}% Health
            </Text>
          </View>

          {/* Health mini progress bar */}
          <View className="mt-2.5 w-full bg-stone-100 dark:bg-stone-850 h-1 rounded-full overflow-hidden">
            <View
              style={{ width: `${scan.health_score}%` }}
              className={`h-full rounded-full ${barColor}`}
            />
          </View>

          {/* Date */}
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className={`text-[9px] mt-2 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}
          >
            {formatDate(scan.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const { user } = useAuth();
  const [scans, setScans] = useState<LocalScanRow[]>([]);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'healthy' | 'sick' | 'unsynced'>('all');

  // Animated values for entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const chipsAnim = useRef(new Animated.Value(0)).current;
  const syncAnim = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  const loadDatabaseData = () => {
    if (!user) return;
    const list = fetchUserScans(user.id);
    setScans(list);
    const unsynced = list.filter((s) => s.synced === 0).length;
    setUnsyncedCount(unsynced);
  };

  useEffect(() => {
    loadDatabaseData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadDatabaseData();
    });
    return unsubscribe;
  }, [navigation, user]);

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

  const handleSyncNow = async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    const success = await syncData(user.id);
    setIsSyncing(false);
    loadDatabaseData();
  };

  const getTranslateY = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
    });
  };

  // Filter and Search logic
  const filteredScans = scans.filter((scan) => {
    const matchesSearch =
      scan.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.condition_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const isHealthy = scan.severity === 'None' || scan.condition_name.toLowerCase().includes('healthy');

    if (selectedFilter === 'healthy') return isHealthy;
    if (selectedFilter === 'sick') return !isHealthy;
    if (selectedFilter === 'unsynced') return scan.synced === 0;
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
      {unsyncedCount > 0 && (
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
          <View className="flex-row items-center flex-1">
            <Ionicons name="cloud-upload" size={18} color="#d97706" />
            <Text
              style={{ fontFamily: 'Fredoka_400Regular' }}
              className={`text-xs font-semibold ml-2 flex-1 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}
            >
              {unsyncedCount === 1 ? '1 scan is waiting to sync (offline)' : `${unsyncedCount} scans are waiting to sync (offline)`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSyncNow}
            disabled={isSyncing}
            className="bg-amber-600 px-3 py-1.5 rounded-lg active:opacity-90 min-w-[70px] items-center justify-center"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className="text-white text-[10px] font-bold"
              >
                Sync Now
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Scans List Scroll view */}
      <Animated.ScrollView
        style={{ opacity: listOpacity }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {filteredScans.length > 0 ? (
          filteredScans.map((scan) => (
            <HistoryScanCard
              key={scan.id}
              scan={scan}
              isDark={isDark}
              onPress={() => router.push({ pathname: '/scan-results', params: { id: scan.id } })}
            />
          ))
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
