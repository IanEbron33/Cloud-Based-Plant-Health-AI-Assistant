import { FredokaText as Text } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  deleteScan,
  fetchUserScans,
  LocalScanRow,
  resolveScan,
  syncData,
  unresolveScan
} from '../../services/scan.service';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'sick', label: 'Infected' },
  { key: 'unsynced', label: 'Unsynced' },
];

interface HistoryScanCardProps {
  scan: LocalScanRow;
  onPress: () => void;
  onMenuOpen: (scan: LocalScanRow, layout: { x: number; y: number }) => void;
  isDark: boolean;
}

function HistoryScanCard({
  scan,
  onPress,
  onMenuOpen,
  isDark,
}: HistoryScanCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const menuButtonRef = useRef<any>(null);

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

  const triggerMenuOpen = () => {
    menuButtonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      onMenuOpen(scan, { x: x - 120 + width, y: y + height });
    });
  };

  const { barColor, text: textStyle } = getSeverityColors(scan.severity);
  const displayImage = scan.cloud_image_url || scan.local_image_path || 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400';

  return (
    <Animated.View
      style={{
        width: '100%',
        transform: [{ scale: scaleAnim }],
        marginBottom: 12,
      }}
    >
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        onLongPress={triggerMenuOpen}
        delayLongPress={250}
        activeOpacity={0.9}
        className={`flex-row p-4 rounded-3xl items-center border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
          }`}
        style={{ opacity: scan.is_resolved === 1 ? 0.55 : 1 }}
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
              style={{
                fontFamily: 'Fredoka_700Bold',
                textDecorationLine: scan.is_resolved === 1 ? 'line-through' : 'none'
              }}
              className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'} flex-1 mr-2`}
              numberOfLines={1}
            >
              {scan.crop_name}
            </Text>

            {/* Icons & Menu Button */}
            <View className="flex-row items-center" style={{ gap: 8 }}>
              {scan.is_resolved === 1 && (
                <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center">
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
              )}
              {scan.synced === 1 ? (
                <Ionicons name="cloud-done-outline" size={16} color="#60a5fa" />
              ) : (
                <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" />
              )}
              <TouchableOpacity
                ref={menuButtonRef}
                onPress={triggerMenuOpen}
                className="p-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color={isDark ? '#a8a29e' : '#78716c'} />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-1">
            <Text
              style={{
                fontFamily: 'Fredoka_400Regular',
                textDecorationLine: scan.is_resolved === 1 ? 'line-through' : 'none'
              }}
              className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'} flex-1 mr-2`}
              numberOfLines={1}
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
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved' | 'all'>('active');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'healthy' | 'sick' | 'unsynced'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'lowest_health' | 'highest_health'>('newest');

  // Funnel Filter Modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState<'active' | 'resolved' | 'all'>('active');
  const [tempSelectedFilter, setTempSelectedFilter] = useState<'all' | 'healthy' | 'sick' | 'unsynced'>('all');
  const [tempSortOrder, setTempSortOrder] = useState<'newest' | 'oldest' | 'lowest_health' | 'highest_health'>('newest');

  const hasActiveFilters = statusFilter !== 'active' || selectedFilter !== 'all' || sortOrder !== 'newest';

  const resetFilters = () => {
    setStatusFilter('active');
    setSelectedFilter('all');
    setSortOrder('newest');
  };

  const getActiveFilterSummary = () => {
    const parts = [];
    if (statusFilter !== 'active') parts.push(statusFilter === 'resolved' ? 'Resolved' : 'All Statuses');
    if (selectedFilter !== 'all') {
      const labels: Record<string, string> = { healthy: 'Healthy', sick: 'Infected', unsynced: 'Unsynced' };
      parts.push(labels[selectedFilter] || selectedFilter);
    }
    if (sortOrder !== 'newest') {
      const sortLabels: Record<string, string> = {
        oldest: 'Oldest First',
        lowest_health: 'Lowest Health %',
        highest_health: 'Highest Health %',
      };
      parts.push(sortLabels[sortOrder] || sortOrder);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Active';
  };

  // Animated values for entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const syncAnim = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  // Modals & Menu Actions
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [unresolveModalVisible, setUnresolveModalVisible] = useState(false);
  const [selectedScanForAction, setSelectedScanForAction] = useState<LocalScanRow | null>(null);

  const deleteModalAnim = useRef(new Animated.Value(0)).current;
  const resolveModalAnim = useRef(new Animated.Value(0)).current;
  const unresolveModalAnim = useRef(new Animated.Value(0)).current;

  const [activeMenuScanId, setActiveMenuScanId] = useState<string | null>(null);
  const [menuLayout, setMenuLayout] = useState<{ x: number; y: number } | null>(null);

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
  }, [selectedFilter, statusFilter, sortOrder, searchQuery]);

  // Hide bottom tab bar dynamically when modal is open
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        display: deleteModalVisible || resolveModalVisible || unresolveModalVisible || filterModalVisible ? 'none' : 'flex',
      },
    });
    return () => {
      navigation.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [deleteModalVisible, resolveModalVisible, unresolveModalVisible, filterModalVisible, navigation]);

  const handleSyncNow = async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    await syncData(user.id);
    setIsSyncing(false);
    loadDatabaseData();
  };

  const getTranslateY = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
    });
  };

  // Modals trigger
  // Modals trigger
  const showDeleteModal = (scan: LocalScanRow) => {
    setSelectedScanForAction(scan);
    setDeleteModalVisible(true);
    Animated.spring(deleteModalAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const hideDeleteModal = () => {
    Animated.timing(deleteModalAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setDeleteModalVisible(false);
      setSelectedScanForAction(null);
    });
  };

  const showResolveModal = (scan: LocalScanRow) => {
    setSelectedScanForAction(scan);
    setResolveModalVisible(true);
    Animated.spring(resolveModalAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const hideResolveModal = () => {
    Animated.timing(resolveModalAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setResolveModalVisible(false);
      setSelectedScanForAction(null);
    });
  };

  const showUnresolveModal = (scan: LocalScanRow) => {
    setSelectedScanForAction(scan);
    setUnresolveModalVisible(true);
    Animated.spring(unresolveModalAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const hideUnresolveModal = () => {
    Animated.timing(unresolveModalAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setUnresolveModalVisible(false);
      setSelectedScanForAction(null);
    });
  };

  const handleResolve = async (scan: LocalScanRow) => {
    await resolveScan(scan.id);
    loadDatabaseData();
  };

  const handleUnresolve = async (scan: LocalScanRow) => {
    await unresolveScan(scan.id);
    loadDatabaseData();
  };

  const handleDelete = async (scan: LocalScanRow) => {
    if (user) {
      await deleteScan(scan.id, user.id);
      loadDatabaseData();
    }
  };

  // Filter, Search, and Sort logic
  const filteredScans = scans
    .filter((scan) => {
      // 1. Status Filter (Active / Resolved / All)
      if (statusFilter === 'active' && scan.is_resolved === 1) return false;
      if (statusFilter === 'resolved' && scan.is_resolved !== 1) return false;

      // 2. Search query
      const matchesSearch =
        scan.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.condition_name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 3. Condition Type Chips
      const isHealthy = scan.severity === 'None' || scan.condition_name.toLowerCase().includes('healthy');

      if (selectedFilter === 'healthy') return isHealthy;
      if (selectedFilter === 'sick') return !isHealthy;
      if (selectedFilter === 'unsynced') return scan.synced === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOrder === 'lowest_health') {
        return a.health_score - b.health_score;
      }
      if (sortOrder === 'highest_health') {
        return b.health_score - a.health_score;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Modal Animations styles
  const deleteModalScale = deleteModalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.0],
  });
  const deleteModalOpacity = deleteModalAnim;

  const resolveModalScale = resolveModalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.0],
  });
  const resolveModalOpacity = resolveModalAnim;

  const unresolveModalScale = unresolveModalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.0],
  });
  const unresolveModalOpacity = unresolveModalAnim;

  const handleMenuOpen = (scan: LocalScanRow, layout: { x: number; y: number }) => {
    setActiveMenuScanId(scan.id);
    setMenuLayout(layout);
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'} px-6 pt-14`}>
      {/* Header */}
      <Animated.View
        style={{ opacity: headerAnim, transform: [{ translateY: getTranslateY(headerAnim) }] }}
        className="mb-5"
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

      {/* Integrated Search Input + Funnel Filter Button Bar */}
      <Animated.View
        style={{ opacity: searchAnim, transform: [{ translateY: getTranslateY(searchAnim) }] }}
        className="flex-row items-center mb-3"
      >
        <View
          className={`flex-1 flex-row items-center px-4 py-2 rounded-2xl border ${
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
        </View>

        {/* Funnel Filter Toggle Button */}
        <TouchableOpacity
          onPress={() => {
            setTempStatusFilter(statusFilter);
            setTempSelectedFilter(selectedFilter);
            setTempSortOrder(sortOrder);
            setFilterModalVisible(true);
          }}
          activeOpacity={0.8}
          className={`ml-2.5 p-3.5 rounded-2xl border items-center justify-center relative ${
            hasActiveFilters
              ? 'bg-emerald-600 border-emerald-600 shadow-sm'
              : isDark
              ? 'bg-stone-900 border-stone-850'
              : 'bg-white border-stone-200 shadow-sm'
          }`}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters ? '#ffffff' : isDark ? '#a8a29e' : '#57534e'}
          />
          {hasActiveFilters && (
            <View className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-stone-950" />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Active Filter Indicator Strip */}
      {hasActiveFilters && (
        <Animated.View
          style={{ opacity: listOpacity }}
          className="flex-row items-center justify-between mb-4 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-2xl"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons name="funnel-outline" size={14} color="#059669" />
            <Text
              style={{ fontFamily: 'Fredoka_400Regular' }}
              className="text-xs text-emerald-800 dark:text-emerald-300 ml-2 font-medium"
              numberOfLines={1}
            >
              Filter: <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="font-bold">{getActiveFilterSummary()}</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={resetFilters}
            className="flex-row items-center bg-emerald-600/10 px-2.5 py-1 rounded-xl"
          >
            <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-[11px] text-emerald-600 font-bold mr-1">
              Reset
            </Text>
            <Ionicons name="close-circle" size={14} color="#059669" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Sync Summary Alert */}
      {unsyncedCount > 0 && (
        <Animated.View
          style={{
            opacity: syncAnim,
            transform: [{ translateY: getTranslateY(syncAnim) }]
          }}
          className={`border px-4 py-3 rounded-2xl flex-row items-center justify-between mb-5 ${isDark
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
              onMenuOpen={handleMenuOpen}
            />
          ))
        ) : (
          <View className="items-center justify-center py-20 px-6">
            {statusFilter === 'active' ? (
              <>
                <View className="w-28 h-28 items-center justify-center mb-4">
                  <Image
                    source={require('../../../assets/images/mascot-happy.png')}
                    style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                  />
                </View>
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-stone-800'}`}
                >
                  All Clear!
                </Text>
                <Text
                  style={{ fontFamily: 'Fredoka_400Regular' }}
                  className="text-xs text-center text-stone-400 mt-1.5 max-w-[220px] leading-5"
                >
                  No active diagnoses! Your crops look healthy. 🌱
                </Text>
              </>
            ) : statusFilter === 'resolved' ? (
              <>
                <View className="w-20 h-20 rounded-full bg-stone-100 dark:bg-stone-900 items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle-outline" size={40} color={isDark ? '#57534e' : '#a8a29e'} />
                </View>
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-stone-800'}`}
                >
                  No Resolved Diagnoses
                </Text>
                <Text
                  style={{ fontFamily: 'Fredoka_400Regular' }}
                  className="text-xs text-center text-stone-400 mt-1.5 max-w-[220px] leading-5"
                >
                  Mark a diagnosis as resolved once your crop has been successfully treated!
                </Text>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        )}
        {/* Spacer to prevent overlapping with floating Tab Bar */}
        <View style={{ height: 110 }} />
      </Animated.ScrollView>

      {/* Floating 3-Dot Options Dropdown Menu Modal */}
      {activeMenuScanId && menuLayout && (
        <Modal transparent animationType="fade" visible={true}>
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1 bg-black/5"
            onPress={() => {
              setActiveMenuScanId(null);
              setMenuLayout(null);
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: menuLayout.y + 4,
                left: Math.max(16, menuLayout.x - 130), // boundary check
                width: 140,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isDark ? '#292524' : '#e7e5e4',
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                padding: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              {/* Resolve / Undo Action */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 rounded-xl active:bg-stone-100 dark:active:bg-stone-850"
                onPress={() => {
                  const targetScan = scans.find(s => s.id === activeMenuScanId);
                  if (targetScan) {
                    if (targetScan.is_resolved === 1) {
                      showUnresolveModal(targetScan);
                    } else {
                      showResolveModal(targetScan);
                    }
                  }
                  setActiveMenuScanId(null);
                  setMenuLayout(null);
                }}
              >
                <Ionicons
                  name={scans.find(s => s.id === activeMenuScanId)?.is_resolved === 1 ? "arrow-undo-outline" : "checkmark-circle-outline"}
                  size={16}
                  color="#10b981"
                />
                <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-xs ml-2 text-stone-700 dark:text-stone-300">
                  {scans.find(s => s.id === activeMenuScanId)?.is_resolved === 1 ? 'Undo Resolve' : 'Resolve'}
                </Text>
              </TouchableOpacity>

              {/* Delete Action */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 rounded-xl active:bg-red-50 dark:active:bg-red-950/20"
                onPress={() => {
                  const targetScan = scans.find(s => s.id === activeMenuScanId);
                  if (targetScan) {
                    showDeleteModal(targetScan);
                  }
                  setActiveMenuScanId(null);
                  setMenuLayout(null);
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-xs ml-2 text-red-500">
                  Delete Scan
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Resolve Confirmation Modal */}
      {resolveModalVisible && (
        <Modal transparent visible={true} animationType="none">
          <View style={{ flex: 1 }} className="justify-center items-center relative z-50">
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              activeOpacity={1}
              onPress={hideResolveModal}
              className="bg-black/60"
            />
            <Animated.View
              style={{
                opacity: resolveModalOpacity,
                transform: [{ scale: resolveModalScale }],
              }}
              className={`w-full max-w-[280px] rounded-[32px] p-6 items-center border shadow-2xl ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-150'}`}
            >
              <View className="w-28 h-28 items-center justify-center mb-4">
                <Image
                  source={require('../../../assets/images/mascot-happy.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
              </View>

              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-[15px] font-bold text-center ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Diagnosis Cured!
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-500 dark:text-stone-400 text-xs text-center mt-2 px-1 leading-5">
                Marking this scan as resolved archives the record and updates your dashboard stats. Keep up the great plant care!
              </Text>

              <View className="flex-row w-full space-x-3 mt-6">
                <TouchableOpacity
                  onPress={hideResolveModal}
                  className={`flex-1 py-3 rounded-2xl items-center border ${isDark ? 'bg-stone-850 border-stone-800' : 'bg-stone-100 border-stone-200'}`}
                  style={{ marginRight: 8 }}
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedScanForAction) {
                      handleResolve(selectedScanForAction);
                    }
                    hideResolveModal();
                  }}
                  className="flex-1 py-3 bg-emerald-600 rounded-2xl items-center"
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white text-xs font-bold">
                    Mark as Cured
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Reactivate (Undo Resolve) Confirmation Modal */}
      {unresolveModalVisible && (
        <Modal transparent visible={true} animationType="none">
          <View style={{ flex: 1 }} className="justify-center items-center relative z-50">
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              activeOpacity={1}
              onPress={hideUnresolveModal}
              className="bg-black/60"
            />
            <Animated.View
              style={{
                opacity: unresolveModalOpacity,
                transform: [{ scale: unresolveModalScale }],
              }}
              className={`w-full max-w-[280px] rounded-[32px] p-6 items-center border shadow-2xl ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-150'}`}
            >
              <View className="w-28 h-28 items-center justify-center mb-4">
                <Image
                  source={require('../../../assets/images/mascot-concerned.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
              </View>

              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-[15px] font-bold text-center ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Reactivate Diagnosis?
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-500 dark:text-stone-400 text-xs text-center mt-2 px-1 leading-5">
                This will move the diagnosis back to your active list. Your Home dashboard and crop severity indicators will update accordingly.
              </Text>

              <View className="flex-row w-full space-x-3 mt-6">
                <TouchableOpacity
                  onPress={hideUnresolveModal}
                  className={`flex-1 py-3 rounded-2xl items-center border ${isDark ? 'bg-stone-850 border-stone-800' : 'bg-stone-100 border-stone-200'}`}
                  style={{ marginRight: 8 }}
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedScanForAction) {
                      handleUnresolve(selectedScanForAction);
                    }
                    hideUnresolveModal();
                  }}
                  className="flex-1 py-3 bg-amber-600 rounded-2xl items-center"
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white text-xs font-bold">
                    Reactivate
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalVisible && (
        <Modal transparent visible={true} animationType="none">
          <View style={{ flex: 1 }} className="justify-center items-center relative z-50">
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              activeOpacity={1}
              onPress={hideDeleteModal}
              className="bg-black/60"
            />
            <Animated.View
              style={{
                opacity: deleteModalOpacity,
                transform: [{ scale: deleteModalScale }],
              }}
              className={`w-full max-w-[280px] rounded-[32px] p-6 items-center border shadow-2xl ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-150'}`}
            >
              <View className="w-28 h-28 items-center justify-center mb-4">
                <Image
                  source={require('../../../assets/images/mascot-transparent-sad.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
              </View>

              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-[15px] font-bold text-center ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Delete Scan?
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-500 dark:text-stone-400 text-xs text-center mt-2 px-1 leading-5">
                This will permanently remove this diagnosis and all follow-up chats. This action cannot be undone.
              </Text>

              <View className="flex-row w-full space-x-3 mt-6">
                <TouchableOpacity
                  onPress={hideDeleteModal}
                  className={`flex-1 py-3 rounded-2xl items-center border ${isDark ? 'bg-stone-850 border-stone-800' : 'bg-stone-100 border-stone-200'}`}
                  style={{ marginRight: 8 }}
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedScanForAction) {
                      handleDelete(selectedScanForAction);
                    }
                    hideDeleteModal();
                  }}
                  className="flex-1 py-3 bg-red-600 rounded-2xl items-center"
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white text-xs font-bold">
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Funnel Filter Bottom Sheet Drawer Modal */}
      {filterModalVisible && (
        <Modal transparent visible={true} animationType="slide">
          <View className="flex-1 justify-end">
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setFilterModalVisible(false)}
              className="flex-1 bg-black/50"
            />
            <View
              className={`w-full rounded-t-[32px] p-6 border-t ${
                isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200 shadow-2xl'
              }`}
            >
              {/* Header */}
              <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-stone-200 dark:border-stone-800">
                <View className="flex-row items-center">
                  <Ionicons name="options-outline" size={20} color="#059669" />
                  <Text
                    style={{ fontFamily: 'Fredoka_700Bold' }}
                    className={`text-lg font-bold ml-2 ${isDark ? 'text-white' : 'text-stone-900'}`}
                  >
                    Filter Diagnostics
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFilterModalVisible(false)}
                  className="p-1 rounded-full bg-stone-100 dark:bg-stone-800"
                >
                  <Ionicons name="close" size={20} color={isDark ? '#a8a29e' : '#78716c'} />
                </TouchableOpacity>
              </View>

              {/* Status Section */}
              <View className="mb-5">
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  Status
                </Text>
                <View className="flex-row gap-2">
                  {[
                    { key: 'active', label: 'Active', icon: 'pulse-outline' },
                    { key: 'resolved', label: 'Resolved', icon: 'checkmark-circle-outline' },
                    { key: 'all', label: 'All', icon: 'albums-outline' },
                  ].map((s) => {
                    const isSel = tempStatusFilter === s.key;
                    return (
                      <TouchableOpacity
                        key={s.key}
                        onPress={() => setTempStatusFilter(s.key as any)}
                        className={`flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-2xl border ${
                          isSel
                            ? 'bg-emerald-600 border-emerald-600'
                            : isDark
                            ? 'bg-stone-850 border-stone-800'
                            : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <Ionicons name={s.icon as any} size={14} color={isSel ? 'white' : '#78716c'} style={{ marginRight: 4 }} />
                        <Text
                          style={{ fontFamily: isSel ? 'Fredoka_700Bold' : 'Fredoka_400Regular' }}
                          className={`text-xs ${isSel ? 'text-white font-bold' : isDark ? 'text-stone-300' : 'text-stone-700'}`}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Condition Type Section */}
              <View className="mb-5">
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  Condition Type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'healthy', label: 'Healthy' },
                    { key: 'sick', label: 'Infected' },
                    { key: 'unsynced', label: 'Unsynced' },
                  ].map((f) => {
                    const isSel = tempSelectedFilter === f.key;
                    return (
                      <TouchableOpacity
                        key={f.key}
                        onPress={() => setTempSelectedFilter(f.key as any)}
                        className={`py-2 px-4 rounded-2xl border ${
                          isSel
                            ? 'bg-emerald-600 border-emerald-600'
                            : isDark
                            ? 'bg-stone-850 border-stone-800'
                            : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <Text
                          style={{ fontFamily: isSel ? 'Fredoka_700Bold' : 'Fredoka_400Regular' }}
                          className={`text-xs ${isSel ? 'text-white font-bold' : isDark ? 'text-stone-300' : 'text-stone-700'}`}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Sort Order Section */}
              <View className="mb-6">
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  Sort Order
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    { key: 'newest', label: 'Newest First' },
                    { key: 'oldest', label: 'Oldest First' },
                    { key: 'lowest_health', label: 'Lowest Health %' },
                    { key: 'highest_health', label: 'Highest Health %' },
                  ].map((so) => {
                    const isSel = tempSortOrder === so.key;
                    return (
                      <TouchableOpacity
                        key={so.key}
                        onPress={() => setTempSortOrder(so.key as any)}
                        className={`py-2 px-3.5 rounded-2xl border ${
                          isSel
                            ? 'bg-emerald-600 border-emerald-600'
                            : isDark
                            ? 'bg-stone-850 border-stone-800'
                            : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <Text
                          style={{ fontFamily: isSel ? 'Fredoka_700Bold' : 'Fredoka_400Regular' }}
                          className={`text-xs ${isSel ? 'text-white font-bold' : isDark ? 'text-stone-300' : 'text-stone-700'}`}
                        >
                          {so.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <TouchableOpacity
                  onPress={() => {
                    setTempStatusFilter('active');
                    setTempSelectedFilter('all');
                    setTempSortOrder('newest');
                  }}
                  className={`py-3.5 px-5 rounded-2xl border items-center justify-center ${
                    isDark ? 'bg-stone-850 border-stone-800' : 'bg-stone-100 border-stone-200'
                  }`}
                >
                  <Text
                    style={{ fontFamily: 'Fredoka_700Bold' }}
                    className={`text-xs font-bold ${isDark ? 'text-stone-400' : 'text-stone-600'}`}
                  >
                    Reset All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setStatusFilter(tempStatusFilter);
                    setSelectedFilter(tempSelectedFilter);
                    setSortOrder(tempSortOrder);
                    setFilterModalVisible(false);
                  }}
                  className="flex-1 py-3.5 bg-emerald-600 rounded-2xl items-center justify-center shadow-md shadow-emerald-600/20"
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white text-xs font-bold">
                    Apply Filters
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
