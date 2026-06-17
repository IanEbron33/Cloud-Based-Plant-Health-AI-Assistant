import React from 'react';
import { View, Text } from 'react-native';

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
  return (
    <View 
      className={`p-4 rounded-2xl mb-3 border border-stone-200 bg-white shadow-sm ${
        colSpan === 1 ? 'w-[48.5%]' : 'w-full'
      } ${className}`}
    >
      {title && (
        <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-stone-200">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-stone-900 flex-1 mr-2">
            {title}
          </Text>
          {icon && <View>{icon}</View>}
        </View>
      )}
      <View className="flex-1 justify-center mt-1">
        {children}
      </View>
    </View>
  );
}
