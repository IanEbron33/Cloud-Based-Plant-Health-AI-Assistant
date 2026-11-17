/**
 * Bugsok AI — Notification Service
 *
 * Handles push notification permissions, device token registration,
 * local daily plant care reminder scheduling, and user notification preferences.
 * Uses dynamic runtime loading with Safe Mode fallback to prevent crashes on APKs
 * built prior to native module compilation.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type * as NotificationsType from 'expo-notifications';

// Dynamic safe loading of expo-notifications to prevent top-level requireNativeModule crash
let Notifications: typeof NotificationsType | null = null;
let isNativeNotificationsAvailable = false;

try {
  // Use dynamic require so missing native module doesn't crash the JS bundle at startup
  const module = require('expo-notifications');
  if (module && typeof module.setNotificationHandler === 'function') {
    Notifications = module;
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    isNativeNotificationsAvailable = true;
  }
} catch (e) {
  console.warn(
    '[Notification Service] Native notifications module not found in current APK build. Running in Safe Mode.'
  );
  Notifications = null;
  isNativeNotificationsAvailable = false;
}

export interface NotificationPreferences {
  enabled: boolean;
  dailyReminder: boolean;
  diseaseAlerts: boolean;
  syncAlerts: boolean;
  pushToken?: string | null;
}

const NOTIFICATION_PREFS_KEY = '@bugsok_notification_preferences';
const DAILY_REMINDER_ID = 'bugsok_daily_plant_check_reminder';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  dailyReminder: true,
  diseaseAlerts: true,
  syncAlerts: true,
  pushToken: null,
};

/**
 * Configure Android notification channels for high priority plant alerts.
 */
export const setupNotificationChannels = async (): Promise<void> => {
  if (!Notifications || !isNativeNotificationsAvailable || Platform.OS !== 'android') return;

  try {
    const importance = Notifications.AndroidImportance?.MAX ?? 5;
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Alerts',
      importance,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#059669',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('disease-alerts', {
      name: 'Severe Disease Alerts',
      importance,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#ef4444',
      sound: 'default',
    });
  } catch (err) {
    console.warn('[Notification Service] setupNotificationChannels safe catch:', err);
  }
};

/**
 * Request system notification permission and obtain an Expo Push Token.
 */
export const requestNotificationPermission = async (
  userId?: string
): Promise<{ granted: boolean; token: string | null; error?: string }> => {
  try {
    if (!Notifications || !isNativeNotificationsAvailable) {
      console.log(
        '[Notification Service] Safe Mode: Native module not linked in APK. Simulating granted permission.'
      );
      return { granted: true, token: 'safe-mode-placeholder-token' };
    }

    await setupNotificationChannels();

    if (!Device.isDevice && Platform.OS !== 'web') {
      console.log('Running on non-physical device. Push tokens require physical device or Expo Dev Client.');
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { granted: false, token: null, error: 'Permission not granted' };
    }

    // Attempt to retrieve Expo push token
    let token: string | null = null;
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = tokenData.data;

      // If user is authenticated, save token to Supabase profiles
      if (userId && token) {
        try {
          await supabase
            .from('profiles')
            .update({ push_token: token } as any)
            .eq('id', userId);
        } catch (dbErr) {
          console.warn('Could not persist push token to Supabase profile:', dbErr);
        }
      }
    } catch (tokenErr) {
      console.warn('Failed to obtain Expo push token (development/simulator fallback):', tokenErr);
    }

    return { granted: true, token };
  } catch (err: any) {
    console.warn('[Notification Service] requestNotificationPermission safe catch:', err);
    return { granted: true, token: null };
  }
};

/**
 * Fetch stored user notification preferences from AsyncStorage.
 */
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
};

/**
 * Save user notification preferences and configure scheduled reminders accordingly.
 */
export const saveNotificationPreferences = async (
  prefs: NotificationPreferences,
  userId?: string
): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));

    // Configure or cancel daily reminders based on preferences
    if (prefs.enabled && prefs.dailyReminder) {
      await scheduleDailyPlantReminder(true);
    } else {
      await scheduleDailyPlantReminder(false);
    }

    // Persist to user profile if available
    if (userId) {
      try {
        await supabase
          .from('profiles')
          .update({
            notifications_enabled: prefs.enabled,
          } as any)
          .eq('id', userId);
      } catch (err) {
        console.warn('Could not sync notification pref to Supabase:', err);
      }
    }
  } catch (err) {
    console.error('Error saving notification preferences:', err);
  }
};

/**
 * Schedule or cancel the recurring morning plant care inspection reminder (8:00 AM daily).
 */
export const scheduleDailyPlantReminder = async (enabled: boolean): Promise<void> => {
  if (!Notifications || !isNativeNotificationsAvailable) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

    if (!enabled) return;

    const triggerType = Notifications.SchedulableTriggerInputTypes?.DAILY ?? ('daily' as any);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'Bugsok Plant Health Check 🌱',
        body: 'Good morning! Take a moment to inspect your crop leaves today to detect diseases early.',
        data: { type: 'daily_reminder' },
        sound: true,
      },
      trigger: {
        type: triggerType,
        hour: 8,
        minute: 0,
      },
    });
  } catch (err) {
    console.warn('[Notification Service] scheduleDailyPlantReminder safe catch:', err);
  }
};

/**
 * Send an immediate test notification to confirm push notifications are working.
 */
export const sendTestNotification = async (): Promise<void> => {
  if (!Notifications || !isNativeNotificationsAvailable) {
    console.log('[Notification Service] Safe Mode: Simulated test notification sent.');
    return;
  }

  try {
    await setupNotificationChannels();
    const triggerType = Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? ('timeInterval' as any);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bugsok AI Alert Test 🔔',
        body: 'Notifications are active! You will receive daily care reminders and urgent crop disease warnings.',
        data: { type: 'test' },
        sound: true,
      },
      trigger: {
        type: triggerType,
        seconds: 2,
      },
    });
  } catch (err) {
    console.warn('[Notification Service] sendTestNotification safe catch:', err);
  }
};

/**
 * Send an immediate alert when a high-severity crop disease is detected.
 */
export const sendSevereDiseaseNotification = async (
  cropName: string,
  conditionName: string,
  severity: string
): Promise<void> => {
  if (!Notifications || !isNativeNotificationsAvailable) return;

  try {
    const prefs = await getNotificationPreferences();
    if (!prefs.enabled || !prefs.diseaseAlerts) return;

    await setupNotificationChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ Severe Infection Detected: ${cropName}`,
        body: `${conditionName} detected (${severity} severity). Tap to review treatment steps immediately.`,
        data: { type: 'disease_alert', cropName, conditionName, severity },
        sound: true,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notification Service] sendSevereDiseaseNotification safe catch:', err);
  }
};

/**
 * Send an alert when offline queued scans finish syncing to the cloud.
 */
export const sendSyncCompleteNotification = async (syncedCount: number): Promise<void> => {
  if (!Notifications || !isNativeNotificationsAvailable) return;

  try {
    const prefs = await getNotificationPreferences();
    if (!prefs.enabled || !prefs.syncAlerts || syncedCount <= 0) return;

    await setupNotificationChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☁️ Cloud Sync Completed',
        body: `Successfully backed up ${syncedCount} offline crop diagnosis scan${
          syncedCount > 1 ? 's' : ''
        } to Supabase.`,
        data: { type: 'sync_alert', syncedCount },
        sound: true,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notification Service] sendSyncCompleteNotification safe catch:', err);
  }
};
