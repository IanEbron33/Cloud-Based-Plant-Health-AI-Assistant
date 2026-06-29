import React, { useEffect, useRef } from 'react';
import { View, useColorScheme, Animated, Dimensions } from 'react-native';
import { FredokaText as Text } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChatScreen() {
  const isDark = useColorScheme() === 'dark';

  // Animation values
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  // Staggered anims for the feature pills
  const pillAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    // 1. Entrance animation for the container card
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 70,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();

    // 2. Looping pulse breathing animation for the "Malapit Na" badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.05,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 3. Staggered fade/translate-up for feature preview pills
    const pillEntranceTransitions = pillAnims.map((anim) => 
      Animated.spring(anim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, pillEntranceTransitions).start();
  }, []);

  // Helper to map pill animation to scale and opacity
  const getPillStyle = (anim: Animated.Value) => {
    return {
      opacity: anim,
      transform: [
        { scale: anim },
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [12, 0],
          }),
        },
      ],
    };
  };

  const features = [
    { icon: 'leaf', text: 'Plant Diagnosis' },
    { icon: 'chatbubbles', text: 'Real-time Chat' },
    { icon: 'sparkles', text: 'AI Powered' },
  ];

  return (
    <View className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'} justify-center items-center px-6 relative`}>
      
      {/* Decorative Mock Chat Bubble 1 (Top Left) */}
      <View 
        className="absolute top-20 left-6 px-4 py-3 bg-stone-200/30 dark:bg-stone-900/30 rounded-3xl rounded-bl-sm border border-stone-200/20"
        style={{ maxWidth: '60%' }}
      >
        <View className="h-2.5 w-24 bg-stone-300/40 dark:bg-stone-800/50 rounded-full mb-2" />
        <View className="h-2.5 w-16 bg-stone-300/40 dark:bg-stone-800/50 rounded-full" />
      </View>

      {/* Decorative Mock Chat Bubble 2 (Middle Right) */}
      <View 
        className="absolute top-40 right-6 px-4 py-3 bg-emerald-500/10 rounded-3xl rounded-br-sm border border-emerald-500/10"
        style={{ maxWidth: '65%' }}
      >
        <View className="h-2.5 w-32 bg-emerald-600/15 dark:bg-emerald-400/20 rounded-full mb-2" />
        <View className="h-2.5 w-20 bg-emerald-600/15 dark:bg-emerald-400/20 rounded-full" />
      </View>

      {/* Decorative Mock Chat Bubble 3 (Bottom Left) */}
      <View 
        className="absolute bottom-28 left-8 px-4 py-3 bg-stone-200/30 dark:bg-stone-900/30 rounded-3xl rounded-bl-sm border border-stone-200/20"
        style={{ maxWidth: '50%' }}
      >
        <View className="h-2.5 w-20 bg-stone-300/40 dark:bg-stone-800/50 rounded-full" />
      </View>

      {/* Main Container Card */}
      <Animated.View
        style={{
          opacity: cardOpacity,
          transform: [{ scale: cardScale }],
        }}
        className={`w-full max-w-[340px] p-8 rounded-[32px] border items-center ${
          isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-100 shadow-sm'
        }`}
      >
        {/* Animated Icon Ring */}
        <View className="w-24 h-24 rounded-full bg-emerald-500/10 items-center justify-center mb-5 relative border border-emerald-500/5">
          <Ionicons name="chatbubbles-outline" size={44} color="#059669" />
          <View className="absolute top-5 right-5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900" />
        </View>

        {/* Pulsing "Malapit Na" Badge */}
        <Animated.View 
          style={{ transform: [{ scale: badgePulse }] }}
          className="bg-emerald-500/15 px-3 py-1 rounded-full mb-4"
        >
          <Text 
            style={{ fontFamily: 'Fredoka_700Bold', letterSpacing: 0.5 }}
            className="text-emerald-600 text-[10px] font-bold uppercase"
          >
            Coming Soon
          </Text>
        </Animated.View>

        <Text 
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className={`text-2xl font-bold text-center mb-3 ${isDark ? 'text-white' : 'text-stone-900'}`}
        >
          Bugsok Chat AI
        </Text>

        <Text 
          style={{ fontFamily: 'Fredoka_400Regular' }}
          className={`text-sm text-center leading-6 mb-6 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
        >
          Chat with our AI Plant Specialist for quick and easy consultations about your crops' health and care.
        </Text>

        {/* Feature Preview Pills */}
        <View className="flex-row flex-wrap justify-center gap-2 mb-2">
          {features.map((feat, index) => (
            <Animated.View 
              key={index} 
              style={[getPillStyle(pillAnims[index]), { margin: 3 }]}
              className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                isDark ? 'bg-stone-950/40 border-stone-800' : 'bg-stone-50 border-stone-150'
              }`}
            >
              <Ionicons 
                name={feat.icon as any} 
                size={11} 
                color="#059669" 
                style={{ marginRight: 4 }} 
              />
              <Text 
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className={`text-[9px] font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}
              >
                {feat.text}
              </Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Bottom Teaser Text */}
      <Text 
        style={{ fontFamily: 'Fredoka_400Regular' }}
        className="absolute bottom-12 text-stone-400 dark:text-stone-600 text-xs text-center w-full px-6"
      >
        Stay tuned for the next app update! 🌱
      </Text>

    </View>
  );
}
