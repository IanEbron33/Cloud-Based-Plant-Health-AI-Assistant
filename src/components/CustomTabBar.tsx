import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to configure labels and icons for each tab route
const getTabConfig = (routeName: string) => {
  switch (routeName) {
    case 'index':
      return { label: 'Home', activeIcon: 'home' as const, inactiveIcon: 'home-outline' as const };
    case 'history':
      return { label: 'History', activeIcon: 'time' as const, inactiveIcon: 'time-outline' as const };
    case 'scan':
      return { label: 'Scan', activeIcon: 'camera' as const, inactiveIcon: 'camera' as const };
    case 'chat':
      return { label: 'Chat', activeIcon: 'chatbubble' as const, inactiveIcon: 'chatbubble-outline' as const };
    case 'profile':
      return { label: 'Profile', activeIcon: 'person' as const, inactiveIcon: 'person-outline' as const };
    default:
      return { label: '', activeIcon: 'help' as const, inactiveIcon: 'help-outline' as const };
  }
};

interface TabButtonProps {
  isFocused: boolean;
  routeName: string;
  onPress: () => void;
  onLongPress: () => void;
}

const TabButton = ({ isFocused, routeName, onPress, onLongPress }: TabButtonProps) => {
  const { label, activeIcon, inactiveIcon } = getTabConfig(routeName);

  // Animation values for the smooth transitions
  const fadeAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1.15 : 1.0)).current;
  const iconTranslateY = useRef(new Animated.Value(isFocused ? -5 : 0)).current;
  const labelTranslateY = useRef(new Animated.Value(isFocused ? 0 : 8)).current;
  const scanScaleAnim = useRef(new Animated.Value(isFocused ? 1.12 : 1.0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Coordinated transitions for regular tabs
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.15 : 1.0,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.spring(iconTranslateY, {
        toValue: isFocused ? -5 : 0,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.spring(labelTranslateY, {
        toValue: isFocused ? 0 : 8,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    if (routeName === 'scan') {
      Animated.spring(scanScaleAnim, {
        toValue: isFocused ? 1.12 : 1.0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();

      if (isFocused) {
        pulseAnim.setValue(0);
        pulseLoopRef.current = Animated.loop(
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          })
        );
        pulseLoopRef.current.start();
      } else {
        if (pulseLoopRef.current) {
          pulseLoopRef.current.stop();
          pulseLoopRef.current = null;
        }
        pulseAnim.setValue(0);
      }
    }

    return () => {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
      }
    };
  }, [isFocused]);

  if (routeName === 'scan') {
    const pulseScale = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1.0, 1.45],
    });

    const pulseOpacity = pulseAnim.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [0.5, 0.3, 0],
    });

    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.scanButtonContainer}
        activeOpacity={0.8}
      >
        {isFocused && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
        )}
        <Animated.View style={[styles.scanButton, { transform: [{ scale: scanScaleAnim }] }]}>
          <View style={styles.scanIconContainer}>
            <Ionicons name="camera" size={26} color="#ffffff" />
            <Ionicons
              name="sparkles"
              size={12}
              color="#ffffff"
              style={styles.scanSparkleBadge}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: iconTranslateY }
              ]
            }
          ]}
        >
          <Ionicons
            name={isFocused ? activeIcon : inactiveIcon}
            size={22}
            color={isFocused ? '#059669' : '#78716c'}
          />
          {routeName === 'chat' && (
            <Ionicons
              name="sparkles"
              size={10}
              color={isFocused ? '#059669' : 'rgba(5, 150, 105, 0.5)'}
              style={styles.sparkleBadge}
            />
          )}
        </Animated.View>
        
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: labelTranslateY }],
            position: 'absolute',
            bottom: 4,
          }}
        >
          <Text style={styles.tabLabel}>{label}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Shared Sliding Pill Layout Math
  const capsuleWidth = 66;
  const capsuleHeight = 56;
  const paddingHorizontal = 8;
  const tabBarWidth = SCREEN_WIDTH - 32;
  const usableWidth = tabBarWidth - paddingHorizontal * 2;
  const tabWidth = usableWidth / 5;

  const getLeftPosition = (index: number) => {
    return paddingHorizontal + (index + 0.5) * tabWidth - capsuleWidth / 2;
  };

  // Initialize position to the currently active tab
  const initialIndex = state.index === 2 ? 0 : state.index; // Fallback if launched on Scan
  const translateX = useRef(new Animated.Value(getLeftPosition(initialIndex))).current;
  const capsuleOpacity = useRef(new Animated.Value(state.index === 2 ? 0 : 1)).current;

  // Initialize border radius: 32 for edges (index 0 or 4), 18 for middle tabs (index 1 or 3)
  const isEdgeIndex = initialIndex === 0 || initialIndex === 4;
  const borderRadiusAnim = useRef(new Animated.Value(isEdgeIndex ? 32 : 18)).current;

  useEffect(() => {
    const isScanTab = state.index === 2;

    // Smoothly fade the sliding capsule in/out
    Animated.timing(capsuleOpacity, {
      toValue: isScanTab ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    // Smoothly slide capsule and morph border radius to the target tab position
    if (!isScanTab) {
      const targetLeft = getLeftPosition(state.index);
      Animated.spring(translateX, {
        toValue: targetLeft,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }).start();

      const targetBorderRadius = state.index === 0 || state.index === 4 ? 32 : 18;
      Animated.spring(borderRadiusAnim, {
        toValue: targetBorderRadius,
        friction: 8,
        tension: 45,
        useNativeDriver: false, // Must be false to animate layout styles like borderRadius
      }).start();
    }
  }, [state.index]);

  return (
    <View style={styles.tabBarContainer}>
      {/* Sliding Background Capsule */}
      <Animated.View
        style={[
          styles.slidingPillContainer,
          {
            width: capsuleWidth,
            height: capsuleHeight,
            opacity: capsuleOpacity,
            transform: [{ translateX }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.slidingPillInner,
            {
              borderRadius: borderRadiusAnim,
            },
          ]}
        />
      </Animated.View>

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabButton
            key={route.key}
            routeName={route.name}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    height: 70,
    backgroundColor: '#ffffff',
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: '#f4f4f5',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  iconWrapper: {
    width: 52,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Fredoka_700Bold',
    textAlign: 'center',
  },
  slidingPillContainer: {
    position: 'absolute',
    top: (70 - 56) / 2, // Center vertically (tabBar height - capsule height) / 2
    left: 0,
    zIndex: 1,
  },
  slidingPillInner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
  },
  scanButtonContainer: {
    width: 64,
    height: 64,
    marginTop: -32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 11,
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    zIndex: 9,
  },
  scanIconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanSparkleBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
  },
  sparkleBadge: {
    position: 'absolute',
    top: 0,
    right: 10,
  },
});
