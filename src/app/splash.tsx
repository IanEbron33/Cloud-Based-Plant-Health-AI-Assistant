import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { FredokaText as Text } from '@/components/themed-text';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  // Staggered fade-in animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  // Full screen fade-out
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1.0s — Fade in app title
    const titleTimer = setTimeout(() => {
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // 1.5s — Fade in subtitle
    const subtitleTimer = setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1500);

    // 3.5s — Begin fade-out of entire screen
    const fadeOutTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 3500);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(subtitleTimer);
      clearTimeout(fadeOutTimer);
    };
  }, []);

  // 4.0s — Navigate based on session state from AuthContext
  useEffect(() => {
    // Wait until AuthContext has finished loading the session
    if (isLoading) return;

    const navTimer = setTimeout(() => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 4000);

    return () => clearTimeout(navTimer);
  }, [isLoading, session]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Mascot Animation — borderless, transparent bg */}
      <View style={styles.imageWrapper}>
        <Image
          source={require('../../assets/images/mascot-animation.webp')}
          style={styles.image}
          contentFit="contain"
        />
      </View>

      {/* App Name — fades in at 1.0s */}
      <Animated.View style={{ opacity: titleOpacity }}>
        <Text style={styles.title}>Bugsok AI</Text>
      </Animated.View>

      {/* Subtitle — fades in at 1.5s */}
      <Animated.View style={{ opacity: subtitleOpacity }}>
        <Text style={styles.subtitle}>AI Powered Crop Health Tracker</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9', // stone-50, matches login screen
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  imageWrapper: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Fredoka_700Bold',
    color: '#1c1917', // stone-900
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Fredoka_400Regular',
    color: '#059669', // emerald-600
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

