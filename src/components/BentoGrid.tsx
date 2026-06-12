import React from 'react';
import { View, Text, useColorScheme } from 'react-native';

interface BentoGridProps {
  children: React.ReactNode;
}

export function BentoGrid({ children }: BentoGridProps) {
  return (
    <View className="flex-row flex-wrap justify-between">
      {children}
    </View>
  );
}

interface BentoTileProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  colSpan?: 1 | 2; // 1 = half width, 2 = full width
  className?: string;
}

export function BentoTile({ 
  title, 
  icon, 
  children, 
  colSpan = 1, 
  className = '' 
}: BentoTileProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View 
      className={`p-4 rounded-3xl mb-3 border ${
        colSpan === 1 ? 'w-[48.5%]' : 'w-full'
      } ${
        isDark 
          ? 'bg-stone-900 border-stone-850' 
          : 'bg-white border-stone-150 shadow-sm'
      } ${className}`}
    >
      {title && (
        <View className="flex-row items-center justify-between mb-2 pb-1.5 border-b border-stone-850/5">
          <Text className={`text-[11px] font-bold uppercase tracking-wider ${
            isDark ? 'text-stone-500' : 'text-stone-400'
          }`}>
            {title}
          </Text>
          {icon && <View>{icon}</View>}
        </View>
      )}
      <View className="flex-1 justify-center">
        {children}
      </View>
    </View>
  );
}
