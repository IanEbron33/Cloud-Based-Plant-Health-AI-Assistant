import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#059669" />
        </View>
        
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Malapit Na</Text>
        </View>

        <Text style={styles.title}>Bugsok Chat AI</Text>
        
        <Text style={styles.subtitle}>
          Makipag-chat sa ating AI Plant Specialist para sa mabilis at madaling konsultasyon tungkol sa kalusugan at pangangalaga ng iyong mga pananim.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9', // stone-50
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f4f4f5',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(5, 150, 105, 0.08)', // light emerald tint
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Fredoka_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    color: '#1c1917', // stone-900
    fontFamily: 'Fredoka_700Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c', // stone-500
    fontFamily: 'Fredoka_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
