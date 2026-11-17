import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, TouchableOpacity, useColorScheme, View, Image, ActivityIndicator, Switch, Linking } from 'react-native';
import { FredokaText as Text } from '@/components/themed-text';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  sendTestNotification,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../services/notification.service';
import { fetchScanStats, syncData } from '../../services/scan.service';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const { user, profile, isLoading, signOut } = useAuth();
  const { showToast } = useToast();
  const [localCount, setLocalCount] = useState(0);
  const [cloudCount, setCloudCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Notification states
  const [notificationSheetVisible, setNotificationSheetVisible] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  // Help & Support states
  const [helpSheetVisible, setHelpSheetVisible] = useState(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Derive display values from auth context
  const displayName = profile?.full_name || 'Anonymous User';
  const avatarUrl = profile?.avatar_url || null;
  const memberSince = user?.created_at
    ? `Member since ${new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
    : '';


  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const dbCardAnim = useRef(new Animated.Value(0)).current;
  const syncBtnAnim = useRef(new Animated.Value(0)).current;
  const settingsHeaderAnim = useRef(new Animated.Value(0)).current;
  const settingsListAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  const loadStats = () => {
    if (!user) return;
    const stats = fetchScanStats(user.id);
    setLocalCount(stats.total);
    setCloudCount(stats.synced);
  };

  useEffect(() => {
    loadStats();
    const unsubscribe = navigation.addListener('focus', () => {
      loadStats();
    });
    return unsubscribe;
  }, [navigation, user]);

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
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (err) {
      router.replace('/login');
    }
  };

  const handleSyncQueued = async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    await syncData(user.id);
    setIsSyncing(false);
    loadStats();
  };

  useEffect(() => {
    getNotificationPreferences().then((prefs) => {
      setNotificationPrefs(prefs);
    });
  }, []);

  const handleToggleMaster = async (value: boolean) => {
    if (value) {
      setIsUpdatingNotifications(true);
      const res = await requestNotificationPermission(user?.id);
      setIsUpdatingNotifications(false);
      if (res.granted) {
        const updated: NotificationPreferences = {
          ...notificationPrefs,
          enabled: true,
          pushToken: res.token,
        };
        setNotificationPrefs(updated);
        await saveNotificationPreferences(updated, user?.id);
        showToast({
          type: 'success',
          title: 'Notifications Enabled',
          message: 'Plant health reminders and disease alerts are now active.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Permission Denied',
          message: 'Please allow notification permissions in phone settings to receive alerts.',
        });
      }
    } else {
      const updated: NotificationPreferences = {
        ...notificationPrefs,
        enabled: false,
      };
      setNotificationPrefs(updated);
      await saveNotificationPreferences(updated, user?.id);
      showToast({
        type: 'info' as any,
        title: 'Notifications Disabled',
        message: 'Plant health reminders have been turned off.',
      });
    }
  };

  const handleToggleGranular = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = {
      ...notificationPrefs,
      [key]: value,
    };
    setNotificationPrefs(updated);
    await saveNotificationPreferences(updated, user?.id);
  };

  const handleSendTestAlert = async () => {
    try {
      await sendTestNotification();
      showToast({
        type: 'success',
        title: 'Test Alert Sent',
        message: 'Check your notification tray in 2 seconds!',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Notification Error',
        message: 'Could not schedule test notification.',
      });
    }
  };

  const faqs = [
    {
      q: 'Which crops are supported by Bugsok AI?',
      a: 'Bugsok AI specializes in Philippine agricultural crops including Talong (Eggplant), Kamatis (Tomato), Sili (Chili), Ampalaya (Bitter Gourd), Kalabasa (Squash), and common garden vegetables.',
    },
    {
      q: 'How does Offline Mode & Cloud Sync work?',
      a: 'You can take scans without internet connection. Diagnoses are stored immediately on your phone via SQLite. When your internet reconnects, you can tap "Sync Queued Scans" to back them up to Supabase.',
    },
    {
      q: 'What is the difference between Flash & Deep Think?',
      a: 'Flash mode delivers rapid 2-second diagnoses with low latency. Deep Think mode runs multi-stage reasoning to analyze symptoms, distinguish similar diseases, and formulate custom treatment plans.',
    },
    {
      q: 'How are Crop Health Scores calculated?',
      a: '80–100% indicates healthy leaf tissue or minor aesthetic spots. 50–79% indicates mild-to-moderate infection requiring monitoring. Below 50% indicates severe disease requiring immediate intervention.',
    },
  ];

  const handleContactSupport = () => {
    Linking.openURL('mailto:ianvincentebron@gmail.com?subject=Bugsok%20AI%20Support%20Request').catch(() => {
      showToast({
        type: 'info' as any,
        title: 'Support Email',
        message: 'Please send your inquiry to ianvincentebron@gmail.com',
      });
    });
  };

  const getTranslateY = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
    });
  };

  const syncPercentage = localCount > 0 ? Math.min(100, Math.round((cloudCount / localCount) * 100)) : 100;

  return (
    <View className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}>
      <ScrollView
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
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
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
          {isLoading ? 'Loading...' : displayName}
        </Text>


        <View className="bg-emerald-900/60 border border-emerald-700/20 px-4 py-1.5 rounded-full mt-4">
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className="text-emerald-200 text-xs font-semibold"
          >
            {isLoading ? 'Checking membership...' : memberSince}
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
                {localCount} {localCount === 1 ? 'scan' : 'scans'}
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
                {cloudCount} {cloudCount === 1 ? 'scan' : 'scans'}
              </Text>
            </View>
            <View className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${syncPercentage}%` }} />
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
            onPress={handleSyncQueued}
            disabled={isSyncing}
            activeOpacity={0.8}
            className="bg-emerald-600 py-4 rounded-2xl flex-row items-center justify-center mb-8 shadow-lg shadow-emerald-600/10 min-h-[50px]"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="sync" size={18} color="white" />
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className="text-white font-bold ml-2 text-sm"
                >
                  Sync Queued Scans
                </Text>
              </>
            )}
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
            onPress={() => setNotificationSheetVisible(true)}
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
            <View className="flex-row items-center">
              <View
                className={`px-2.5 py-1 rounded-full mr-2 ${
                  notificationPrefs.enabled
                    ? 'bg-emerald-100 dark:bg-emerald-950/60'
                    : 'bg-stone-100 dark:bg-stone-800'
                }`}
              >
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-[10px] ${
                    notificationPrefs.enabled
                      ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'text-stone-400'
                  }`}
                >
                  {notificationPrefs.enabled ? 'Active' : 'Off'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={isDark ? '#57534e' : '#a8a29e'} />
            </View>
          </TouchableOpacity>

          {/* Help & Support setting item */}
          <TouchableOpacity
            onPress={() => setHelpSheetVisible(true)}
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
      {/* Spacer to prevent overlapping with floating Tab Bar */}
      <View style={{ height: 110 }} />
    </ScrollView>

    {/* Notification Preferences Bottom Sheet */}
    <BottomSheet
      visible={notificationSheetVisible}
      onClose={() => setNotificationSheetVisible(false)}
      title="Notification Settings"
      titleIcon={<Ionicons name="notifications-outline" size={20} color="#059669" />}
    >
      <View className="px-6 pt-2 pb-8">
        {/* Informational Hero Card */}
        <View className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-emerald-600 items-center justify-center mr-3.5">
            <Ionicons name="leaf" size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-emerald-900 dark:text-emerald-200 text-sm">
              Plant Health & Care Alerts
            </Text>
            <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5 leading-4">
              Receive morning leaf inspection reminders and real-time warnings when severe crop diseases are diagnosed.
            </Text>
          </View>
        </View>

        {/* Master Push Notification Toggle */}
        <View
          className={`p-4 rounded-2xl border mb-4 flex-row items-center justify-between ${
            isDark ? 'bg-stone-850 border-stone-800' : 'bg-stone-50 border-stone-200'
          }`}
        >
          <View className="flex-1 mr-4">
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className={`text-sm ${isDark ? 'text-white' : 'text-stone-900'}`}
            >
              Allow Push Notifications
            </Text>
            <Text
              style={{ fontFamily: 'Fredoka_400Regular' }}
              className={`text-xs mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
            >
              Enable device notifications from Bugsok AI
            </Text>
          </View>
          {isUpdatingNotifications ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <Switch
              value={notificationPrefs.enabled}
              onValueChange={handleToggleMaster}
              trackColor={{ false: '#e7e5e4', true: '#059669' }}
              thumbColor="#ffffff"
            />
          )}
        </View>

        {/* Granular Toggles (Available when enabled) */}
        {notificationPrefs.enabled && (
          <View
            className={`rounded-2xl border overflow-hidden mb-5 ${
              isDark ? 'bg-stone-850 border-stone-800' : 'bg-stone-50 border-stone-200'
            }`}
          >
            {/* Daily Reminder */}
            <View
              className={`p-4 flex-row items-center justify-between border-b ${
                isDark ? 'border-stone-800' : 'border-stone-200/60'
              }`}
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 items-center justify-center mr-3">
                  <Ionicons name="sunny-outline" size={16} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: 'Fredoka_700Bold' }}
                    className={`text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}
                  >
                    Daily Plant Care Reminders
                  </Text>
                  <Text
                    style={{ fontFamily: 'Fredoka_400Regular' }}
                    className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
                  >
                    Morning reminder (8:00 AM) to inspect leaf health
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationPrefs.dailyReminder}
                onValueChange={(val) => handleToggleGranular('dailyReminder', val)}
                trackColor={{ false: '#e7e5e4', true: '#059669' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Severe Disease Alerts */}
            <View
              className={`p-4 flex-row items-center justify-between border-b ${
                isDark ? 'border-stone-800' : 'border-stone-200/60'
              }`}
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 items-center justify-center mr-3">
                  <Ionicons name="warning-outline" size={16} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: 'Fredoka_700Bold' }}
                    className={`text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}
                  >
                    Severe Disease Warnings
                  </Text>
                  <Text
                    style={{ fontFamily: 'Fredoka_400Regular' }}
                    className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
                  >
                    Immediate alerts when high-risk symptoms appear
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationPrefs.diseaseAlerts}
                onValueChange={(val) => handleToggleGranular('diseaseAlerts', val)}
                trackColor={{ false: '#e7e5e4', true: '#059669' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Sync Status Alerts */}
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 items-center justify-center mr-3">
                  <Ionicons name="cloud-done-outline" size={16} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: 'Fredoka_700Bold' }}
                    className={`text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}
                  >
                    Cloud Sync Completion
                  </Text>
                  <Text
                    style={{ fontFamily: 'Fredoka_400Regular' }}
                    className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
                  >
                    Notify when queued offline scans finish uploading
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationPrefs.syncAlerts}
                onValueChange={(val) => handleToggleGranular('syncAlerts', val)}
                trackColor={{ false: '#e7e5e4', true: '#059669' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        )}

        {/* Test Notification Action */}
        {notificationPrefs.enabled && (
          <TouchableOpacity
            onPress={handleSendTestAlert}
            activeOpacity={0.85}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 flex-row items-center justify-center shadow-md shadow-emerald-600/20"
          >
            <Ionicons name="paper-plane-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className="text-white text-xs font-bold"
            >
              Send Test Alert
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </BottomSheet>

    {/* Help & Support Bottom Sheet */}
    <BottomSheet
      visible={helpSheetVisible}
      onClose={() => setHelpSheetVisible(false)}
      title="Help & Support"
      titleIcon={<Ionicons name="help-circle-outline" size={20} color="#d97706" />}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-6 pt-2 pb-8"
        contentContainerStyle={{ paddingBottom: 24 }}
        style={{ maxHeight: 520 }}
      >
        {/* Help Banner Hero Card */}
        <View className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-amber-500 items-center justify-center mr-3.5">
            <Ionicons name="book-outline" size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-amber-900 dark:text-amber-200 text-sm">
              Bugsok AI Guide & FAQs
            </Text>
            <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-amber-700 dark:text-amber-400 text-xs mt-0.5 leading-4">
              Learn how to take accurate plant scans, understand AI diagnoses, and reach support.
            </Text>
          </View>
        </View>

        {/* Scanning Best Practices Section */}
        <View className="mb-5">
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            Leaf Scanning Tips
          </Text>

          <View className={`rounded-2xl border p-4 ${
            isDark ? 'bg-stone-850 border-stone-800' : 'bg-stone-50 border-stone-200'
          }`}>
            <View className="flex-row items-start mb-3">
              <Ionicons name="camera-outline" size={18} color="#059669" style={{ marginTop: 2, marginRight: 10 }} />
              <View className="flex-1">
                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Target Visible Symptoms
                </Text>
                <Text style={{ fontFamily: 'Fredoka_400Regular' }} className={`text-[11px] mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                  Position camera 10–15 cm from leaf spots, mildew, or lesions.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mb-3">
              <Ionicons name="sunny-outline" size={18} color="#d97706" style={{ marginTop: 2, marginRight: 10 }} />
              <View className="flex-1">
                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Ensure Clear Natural Light
                </Text>
                <Text style={{ fontFamily: 'Fredoka_400Regular' }} className={`text-[11px] mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                  Take photos in good daytime lighting without harsh shadows or direct flash glare.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <Ionicons name="leaf-outline" size={18} color="#059669" style={{ marginTop: 2, marginRight: 10 }} />
              <View className="flex-1">
                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className={`text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  One Crop Leaf at a Time
                </Text>
                <Text style={{ fontFamily: 'Fredoka_400Regular' }} className={`text-[11px] mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                  Avoid background soil or multiple overlapping leaves for highest confidence.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Frequently Asked Questions */}
        <View className="mb-6">
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            Frequently Asked Questions
          </Text>

          <View className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-stone-850 border-stone-800' : 'bg-stone-50 border-stone-200'
          }`}>
            {faqs.map((faq, index) => {
              const isExpanded = expandedFaqIndex === index;
              return (
                <View
                  key={index}
                  className={`border-b ${
                    index === faqs.length - 1 ? 'border-b-0' : isDark ? 'border-stone-800' : 'border-stone-200/60'
                  }`}
                >
                  <TouchableOpacity
                    onPress={() => setExpandedFaqIndex(isExpanded ? null : index)}
                    activeOpacity={0.7}
                    className="p-4 flex-row items-center justify-between"
                  >
                    <Text
                      style={{ fontFamily: 'Fredoka_700Bold' }}
                      className={`text-xs flex-1 mr-3 ${isDark ? 'text-white' : 'text-stone-900'}`}
                    >
                      {faq.q}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={isDark ? '#a8a29e' : '#78716c'}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View className="px-4 pb-4 pt-1">
                      <Text
                        style={{ fontFamily: 'Fredoka_400Regular' }}
                        className={`text-xs leading-5 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}
                      >
                        {faq.a}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Contact Support Action */}
        <TouchableOpacity
          onPress={handleContactSupport}
          activeOpacity={0.85}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 flex-row items-center justify-center shadow-md shadow-emerald-600/20 mb-2"
        >
          <Ionicons name="mail-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className="text-white text-xs font-bold"
          >
            Contact Support & Feedback
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  </View>
  );
}
