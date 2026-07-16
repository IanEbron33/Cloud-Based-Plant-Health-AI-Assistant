import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  useColorScheme, 
  Animated, 
  ActivityIndicator, 
  PanResponder, 
  Modal, 
  Easing 
} from 'react-native';
import { FredokaText as Text } from '@/components/themed-text';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchUserScans, 
  syncData, 
  LocalScanRow, 
  resolveScan, 
  unresolveScan, 
  deleteScan 
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
  onResolve: () => void;
  onUnresolve: () => void;
  onDelete: () => void;
  onMenuOpen: (scan: LocalScanRow, layout: { x: number; y: number }) => void;
  isDark: boolean;
}

function HistoryScanCard({
  scan,
  onPress,
  onResolve,
  onUnresolve,
  onDelete,
  onMenuOpen,
  isDark,
}: HistoryScanCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.Value(0)).current;
  const menuButtonRef = useRef<any>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(-130, Math.min(0, gestureState.dx));
        pan.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -45) {
          Animated.spring(pan, {
            toValue: -130,
            useNativeDriver: true,
            tension: 80,
            friction: 7,
          }).start();
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // Reset swipe state when scan is resolved / unresolved
  useEffect(() => {
    Animated.spring(pan, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [scan.is_resolved]);

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
    <View style={{ position: 'relative', marginBottom: 12 }}>
      {/* Swipe actions background */}
      <View 
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 130,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 4,
        }}
      >
        {/* Resolve or Undo Button */}
        <TouchableOpacity
          onPress={() => {
            Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
            if (scan.is_resolved === 1) {
              onUnresolve();
            } else {
              onResolve();
            }
          }}
          className={`w-[60px] h-[90%] items-center justify-center rounded-l-2xl ${scan.is_resolved === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}
        >
          <Ionicons name={scan.is_resolved === 1 ? "arrow-undo-outline" : "checkmark-outline"} size={20} color="white" />
          <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-[10px] text-white mt-1 font-bold">
            {scan.is_resolved === 1 ? 'Undo' : 'Resolve'}
          </Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          onPress={() => {
            Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
            onDelete();
          }}
          className="w-[60px] h-[90%] items-center justify-center bg-red-500 rounded-r-3xl"
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-[10px] text-white mt-1 font-bold">
            Delete
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Card Animates Horizontally */}
      <Animated.View 
        {...panResponder.panHandlers}
        style={{ 
          transform: [{ translateX: pan }, { scale: scaleAnim }],
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          activeOpacity={0.9}
          className={`flex-row p-4 rounded-3xl items-center border ${
            isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100 shadow-sm'
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
                  onPress={() => {
                    menuButtonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
                      onMenuOpen(scan, { x: x - 120 + width, y: y + height });
                    });
                  }}
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
    </View>
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

  // Animated values for entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const statusFilterAnim = useRef(new Animated.Value(0)).current;
  const chipsAnim = useRef(new Animated.Value(0)).current;
  const syncAnim = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  // Sliding Pill Animation
  const [containerWidth, setContainerWidth] = useState(0);
  const slidingAnim = useRef(new Animated.Value(0)).current;

  // Modals & Menu Actions
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedScanForAction, setSelectedScanForAction] = useState<LocalScanRow | null>(null);

  const deleteModalAnim = useRef(new Animated.Value(0)).current;
  const resolveModalAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(statusFilterAnim, {
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
  }, [selectedFilter, statusFilter, searchQuery]);

  // sliding pill target calculation
  useEffect(() => {
    let toValue = 0;
    if (statusFilter === 'resolved') toValue = 1;
    else if (statusFilter === 'all') toValue = 2;

    Animated.spring(slidingAnim, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [statusFilter]);

  // Hide bottom tab bar dynamically when modal is open
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        display: deleteModalVisible || resolveModalVisible ? 'none' : 'flex',
      },
    });
    return () => {
      navigation.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [deleteModalVisible, resolveModalVisible, navigation]);

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
  const showDeleteModal = (scan: LocalScanRow) => {
    setSelectedScanForAction(scan);
    setDeleteModalVisible(true);
    Animated.timing(deleteModalAnim, {
      toValue: 1,
      duration: 200,
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
    Animated.timing(resolveModalAnim, {
      toValue: 1,
      duration: 200,
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

  // Filter and Search logic
  const filteredScans = scans.filter((scan) => {
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
  });

  // sliding pill dimensions
  const pillWidth = containerWidth ? (containerWidth - 8) / 3 : 0;
  const translateX = slidingAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [4, 4 + pillWidth, 4 + 2 * pillWidth],
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

  const handleMenuOpen = (scan: LocalScanRow, layout: { x: number; y: number }) => {
    setActiveMenuScanId(scan.id);
    setMenuLayout(layout);
  };

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
        className={`flex-row items-center px-4 py-2 rounded-2xl mb-4 border ${
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

      {/* Segmented Sliding Pill Filter Bar */}
      <Animated.View
        style={{ 
          opacity: statusFilterAnim, 
          transform: [{ translateY: getTranslateY(statusFilterAnim) }]
        }}
        className={`bg-stone-150 dark:bg-stone-900 rounded-[20px] h-10 p-1 relative items-center mb-4 flex-row`}
      >
        {containerWidth > 0 && (
          <Animated.View
            style={{
              position: 'absolute',
              width: pillWidth,
              height: 32,
              backgroundColor: '#478b59', // crop-500
              borderRadius: 16,
              transform: [{ translateX }],
            }}
          />
        )}
        <View 
          className="flex-row w-full h-full items-center z-10"
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {(['active', 'resolved', 'all'] as const).map((status) => {
            const isSelected = statusFilter === status;
            const label = status === 'active' ? 'Active' : status === 'resolved' ? 'Resolved' : 'All';
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                activeOpacity={0.9}
                className="flex-1 items-center justify-center h-full"
              >
                <Text
                  style={{ fontFamily: isSelected ? 'Fredoka_700Bold' : 'Fredoka_400Regular' }}
                  className={`text-xs ${isSelected ? 'text-white' : isDark ? 'text-stone-400' : 'text-stone-600'}`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
              onResolve={() => handleResolve(scan)}
              onUnresolve={() => handleUnresolve(scan)}
              onDelete={() => showDeleteModal(scan)}
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
                      handleUnresolve(targetScan);
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
                Mark as Resolved?
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-500 dark:text-stone-400 text-xs text-center mt-2 px-1 leading-5">
                This diagnosis will be marked as treated. You can still view it in Resolved history.
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
                    Resolve
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
    </View>
  );
}
