import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Fredoka_400Regular, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import '../global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

/** Inner layout that uses the auth context for route guards. */
function RootNavigator() {
  const scheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    // Don't redirect while auth state is still being determined
    if (isLoading) return;

    const isSplashOrAuth =
      segments[0] === 'login' ||
      segments[0] === 'register' ||
      segments[0] === 'splash' ||
      !segments[0];

    if (!session) {
      // If not logged in and on a protected screen, redirect to login
      if (!isSplashOrAuth) {
        router.replace('/login');
      }
    } else {
      // If logged in and on an auth screen, redirect to tabs
      if (segments[0] === 'login' || segments[0] === 'register') {
        router.replace('/(tabs)');
      }
    }
  }, [session, isLoading, segments]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splash" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="scan-results" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right'
          }} 
        />
        <Stack.Screen 
          name="chat" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_bottom'
          }} 
        />
      </Stack>
    </>
  );
}

/** Root layout — loads fonts and wraps the app in AuthProvider. */
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fredoka_400Regular,
    Fredoka_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <RootNavigator />
      </ToastProvider>
    </AuthProvider>
  );
}
