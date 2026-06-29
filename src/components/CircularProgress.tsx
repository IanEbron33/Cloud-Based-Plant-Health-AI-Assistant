import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FredokaText as Text } from './themed-text';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export default function CircularProgress({
  percentage,
  size = 90,
  strokeWidth = 8,
  color = '#10b981', // Default emerald-500
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const progress = useSharedValue(0);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(percentage, {
      duration: 800,
      easing: Easing.linear,
    });
  }, [percentage]);

  useDerivedValue(() => {
    runOnJS(setDisplayPercent)(Math.round(progress.value));
  });

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (progress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background Track Circle */}
        <Circle
          stroke="#f5f5f4" // stone-100 (light-mode only)
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Foreground Progress Circle */}
        <AnimatedCircle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Centered Percentage Text */}
      <View className="absolute items-center justify-center">
        <Text className="text-base font-extrabold text-stone-900">
          {displayPercent}%
        </Text>
      </View>
    </View>
  );
}
