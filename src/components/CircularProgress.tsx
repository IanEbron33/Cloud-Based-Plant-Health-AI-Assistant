import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background Track Circle */}
        <Circle
          stroke={isDark ? '#292524' : '#f5f5f4'} // stone-800 / stone-100
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Foreground Progress Circle */}
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Centered Percentage Text */}
      <View className="absolute items-center justify-center">
        <Text className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-stone-900'}`}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
}
