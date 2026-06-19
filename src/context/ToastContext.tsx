/**
 * Bugsok AI — Custom Toast Context Provider
 *
 * Provides a global system for displaying custom, theme-aligned Toast notifications.
 * Renders an animated overlay at the top of the screen below the status bar notch.
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onPress?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  isVisible: boolean;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState<{
    visible: boolean;
    type: ToastType;
    title?: string;
    message: string;
    onPress?: () => void;
  }>({
    visible: false,
    type: 'info',
    message: '',
  });

  // Animated values
  const slideAnim = useRef(new Animated.Value(-120)).current; // Start off-screen (above)
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current; // Scale bounce entry
  const progressAnim = useRef(new Animated.Value(1)).current; // Timer progress bar

  // Auto-dismiss timeout ref
  const timerRef = useRef<any>(null);

  const hideToast = useCallback(() => {
    // Animate out (fade and slide up)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  }, [slideAnim, opacityAnim, scaleAnim]);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 3500, onPress }: ToastOptions) => {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set the content
      setToast({
        visible: true,
        type,
        title,
        message,
        onPress,
      });

      // Reset progress bar
      progressAnim.setValue(1);

      // Animate in with Spring bounce
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate the progress bar width over the duration
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false, // width cannot use native driver
      }).start();

      // Set auto-dismiss timer
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, slideAnim, opacityAnim, scaleAnim, progressAnim]
  );

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Helper for choosing icons
  const getIconName = (type: ToastType): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  // Helper for border and bg color styling based on type and dark mode
  const getToastColors = (type: ToastType) => {
    if (isDark) {
      switch (type) {
        case 'success':
          return { bg: 'bg-stone-900/95', border: 'border-emerald-800/30', icon: '#10b981' };
        case 'error':
          return { bg: 'bg-stone-900/95', border: 'border-red-800/30', icon: '#ef4444' };
        case 'warning':
          return { bg: 'bg-stone-900/95', border: 'border-amber-800/30', icon: '#f59e0b' };
        case 'info':
        default:
          return { bg: 'bg-stone-900/95', border: 'border-stone-800', icon: '#3b82f6' };
      }
    } else {
      switch (type) {
        case 'success':
          return { bg: 'bg-white', border: 'border-stone-100', icon: '#059669' };
        case 'error':
          return { bg: 'bg-white', border: 'border-stone-100', icon: '#dc2626' };
        case 'warning':
          return { bg: 'bg-white', border: 'border-stone-100', icon: '#d97706' };
        case 'info':
        default:
          return { bg: 'bg-white', border: 'border-stone-100', icon: '#2563eb' };
      }
    }
  };

  const colors = getToastColors(toast.type);
  const defaultTitle = toast.type.charAt(0).toUpperCase() + toast.type.slice(1);
  const topPosition = insets.top > 0 ? insets.top + 8 : 16;

  return (
    <ToastContext.Provider value={{ showToast, isVisible: toast.visible }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={{
            position: 'absolute',
            top: topPosition,
            left: 16,
            right: 16,
            zIndex: 9999,
            opacity: opacityAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
          }}
        >
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => {
              if (toast.onPress) {
                toast.onPress();
              }
              hideToast();
            }}
            style={{
              flexDirection: 'row',
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.16,
              shadowRadius: 20,
              elevation: 8,
            }}
            className={`${colors.bg} ${isDark ? 'border-stone-800' : 'border-stone-100'}`}
          >
            {/* Inner Content Block */}
            <View className="flex-1 flex-row p-4 items-start pr-12">
              {/* Left Icon with soft backdrop */}
              <View 
                style={{ backgroundColor: `${colors.icon}15` }}
                className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5"
              >
                <Ionicons name={getIconName(toast.type)} size={19} color={colors.icon} />
              </View>

              {/* Text Content */}
              <View className="flex-1 justify-center">
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-sm font-bold leading-5 ${isDark ? 'text-stone-100' : 'text-stone-900'}`}
                >
                  {toast.title || defaultTitle}
                </Text>
                <Text
                  style={{ fontFamily: 'Fredoka_400Regular' }}
                  className={`text-xs mt-0.5 leading-5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}
                >
                  {toast.message}
                </Text>
              </View>
            </View>

            {/* Close action icon (centered vertically inside touchable zone) */}
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={hideToast}
              className="absolute right-4 top-0 bottom-0 justify-center"
            >
              <Ionicons name="close" size={18} color={isDark ? '#78716c' : '#a8a29e'} />
            </TouchableOpacity>

            {/* Bottom Timer Progress Bar (rounds on both bottom corners) */}
            <View 
              style={{ borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-stone-100 dark:bg-stone-900 overflow-hidden"
            >
              <Animated.View
                style={{
                  height: '100%',
                  backgroundColor: colors.icon,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast() must be used within a <ToastProvider>. Wrap your layout with <ToastProvider>.');
  }
  return context;
}
