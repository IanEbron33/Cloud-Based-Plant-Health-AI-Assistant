import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  StyleSheet,
  useColorScheme,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 90;
const VELOCITY_THRESHOLD = 500;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  titleIcon?: React.ReactNode;
  headerRight?: React.ReactNode;
  showCloseButton?: boolean;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  maxHeight?: number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  titleIcon,
  headerRight,
  showCloseButton = true,
  children,
  contentContainerStyle,
  maxHeight = SCREEN_HEIGHT * 0.85,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isRendered, setIsRendered] = useState(visible);
  const sheetHeight = useSharedValue(SCREEN_HEIGHT * 0.5);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const triggerClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateIn = useCallback(() => {
    backdropOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
    translateY.value = withSpring(0, {
      damping: 24,
      stiffness: 220,
      mass: 0.8,
    });
  }, [backdropOpacity, translateY]);

  const animateOut = useCallback(
    (onComplete?: () => void) => {
      backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      translateY.value = withTiming(
        sheetHeight.value > 0 ? sheetHeight.value + 50 : 500,
        { duration: 200, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) {
            runOnJS(setIsRendered)(false);
            if (onComplete) {
              runOnJS(onComplete)();
            }
          }
        }
      );
    },
    [backdropOpacity, translateY, sheetHeight]
  );

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      requestAnimationFrame(() => {
        animateIn();
      });
    } else if (isRendered) {
      animateOut();
    }
  }, [visible, animateIn, animateOut, isRendered]);

  const handleBackdropPress = () => {
    animateOut(triggerClose);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      sheetHeight.value = height;
    }
  };

  // Pan gesture for interactive drag-to-dismiss across entire sheet
  const panGesture = Gesture.Pan()
    .activeOffsetY([6, 1000])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        // Dragging downward: track 1:1
        translateY.value = event.translationY;
      } else {
        // Dragging upward: apply rubber-band damping
        translateY.value = event.translationY * 0.18;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > VELOCITY_THRESHOLD) {
        // Dismiss
        translateY.value = withTiming(
          sheetHeight.value > 0 ? sheetHeight.value + 60 : 500,
          { duration: 180, easing: Easing.in(Easing.quad) },
          (finished) => {
            if (finished) {
              runOnJS(setIsRendered)(false);
              runOnJS(triggerClose)();
            }
          }
        );
        backdropOpacity.value = withTiming(0, { duration: 180 });
      } else {
        // Snap back
        translateY.value = withSpring(0, {
          damping: 24,
          stiffness: 240,
          mass: 0.8,
        });
      }
    });

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isRendered) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => animateOut(triggerClose)}
    >
      <View className="flex-1 justify-end">
        {/* Animated Dimmed Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0, 0, 0, 0.55)' },
            animatedBackdropStyle,
          ]}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleBackdropPress} />
        </Animated.View>

        {/* Sliding Bottom Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            onLayout={handleLayout}
            style={[
              {
                maxHeight,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                borderTopWidth: 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -6 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 24,
                overflow: 'hidden',
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                borderColor: isDark ? '#292524' : '#e7e5e4',
              },
              animatedSheetStyle,
              contentContainerStyle,
            ]}
          >
            {/* Top Drag Handle Bar */}
            <View className="w-full pt-3 pb-1 bg-transparent">
              <View
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 3,
                  alignSelf: 'center',
                  marginBottom: 10,
                  backgroundColor: isDark ? '#57534e' : '#d6d3d1',
                }}
              />

              {/* Optional Header Row */}
              {(title || showCloseButton || headerRight) ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingBottom: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#292524' : '#f5f5f4',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {titleIcon ? <View style={{ marginRight: 8 }}>{titleIcon}</View> : null}
                    {title ? (
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: '700',
                          color: isDark ? '#f5f5f4' : '#1c1917',
                          fontFamily: 'Fredoka_700Bold',
                        }}
                      >
                        {title}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {headerRight}
                    {showCloseButton ? (
                      <Pressable
                        onPress={() => animateOut(triggerClose)}
                        hitSlop={10}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isDark ? '#292524' : '#f5f5f4',
                        }}
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color={isDark ? '#a8a29e' : '#78716c'}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>

            {/* Sheet Body Content */}
            <View style={{ flexShrink: 1 }}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

export default BottomSheet;
