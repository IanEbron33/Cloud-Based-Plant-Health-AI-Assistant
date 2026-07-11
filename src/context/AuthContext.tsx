/**
 * Bugsok AI — Auth Context Provider
 *
 * Provides global authentication state and methods to the entire app.
 * Wraps the root layout so any screen can access auth via `useAuth()`.
 *
 * Features:
 * - Listens to Supabase auth state changes (sign-in, sign-out, token refresh)
 * - Auto-fetches the user profile from the `profiles` table after login
 * - Exposes signIn(), signUp(), signOut(), and refreshProfile() methods
 * - Tracks isLoading state during auth transitions
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthContextValue, UserProfile } from '../types';
import * as authService from '../services/auth.service';
import { fetchUserProfile, updateUserProfile } from '../services/profile.service';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  /**
   * Fetch the user's profile from the `profiles` table.
   * Called automatically after auth state changes and exposed
   * publicly so screens can manually refresh if needed.
   */
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await fetchUserProfile(user.id);
    setProfile(profileData);
  }, [user]);

  // Auto-fetch profile whenever the user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  // Subscribe to Supabase auth state changes on mount
  useEffect(() => {
    // Initialize Google Sign-in configuration
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    // 1. Check for an existing session on app startup
    const initSession = async () => {
      const existingSession = await authService.getSession();
      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);
      }
      setIsLoading(false);
    };

    initSession();

    // 2. Listen for auth changes (sign-in, sign-out, token refresh)
    const subscription = authService.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // If we were still loading (e.g., initial session check), mark as done
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password.
   * @returns An object with `error` (null on success, message on failure).
   */
  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.signInWithEmail(email, password);
    return { error: result.error };
  }, []);

  /**
   * Sign in using Native Google Sign-In and exchange for Supabase session.
   * On first login, automatically populates the user's profile metadata.
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('No ID token returned from Google Sign-In.');
      }

      const result = await authService.signInWithGoogleIdToken(idToken);
      if (result.error) {
        return { error: result.error };
      }

      // Populate user profile if it's the first time
      if (result.user) {
        const googleMeta = result.user.user_metadata;
        const fullName = googleMeta?.full_name || userInfo.data?.user?.name || '';
        const avatarUrl = googleMeta?.avatar_url || userInfo.data?.user?.photo || null;

        const existingProfile = await fetchUserProfile(result.user.id);
        if (!existingProfile || !existingProfile.full_name) {
          await updateUserProfile(result.user.id, {
            full_name: fullName,
            avatar_url: avatarUrl,
          });
        }
      }

      return { error: null };
    } catch (err: any) {
      console.warn('Google Sign-In failed:', err);
      // Clean display of cancellation without raising error toasts
      if (err.code === 'SIGN_IN_CANCELLED') {
        return { error: 'Sign-in cancelled' };
      }
      return { error: err.message || 'Google Sign-In failed' };
    }
  }, []);

  /**
   * Sign up a new user with email, password, and full name.
   * The session/user state will be updated automatically via the auth listener.
   * @returns An object with `user` and `error`.
   */
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const result = await authService.signUpWithEmail(email, password, fullName);
    return {
      user: result.user,
      error: result.error,
    };
  }, []);

  /**
   * Sign out the current user.
   * The auth listener will clear the user/session/profile state automatically.
   */
  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch (googleError) {
      console.warn('Error signing out from Google:', googleError);
    }
    await authService.signOut();
  }, []);

  const sendResetEmail = useCallback(async (email: string) => {
    const result = await authService.sendPasswordResetEmail(email);
    return { error: result.error };
  }, []);

  const verifyRecoveryCode = useCallback(async (email: string, code: string) => {
    const result = await authService.verifyRecoveryOtp(email, code);
    return { error: result.error };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const result = await authService.updateUserPassword(password);
    return { error: result.error };
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    isLoading,
    isRegistering,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    refreshProfile,
    setIsRegistering,
    sendResetEmail,
    verifyRecoveryCode,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the global auth state and methods.
 * Must be used within an `<AuthProvider>` wrapper.
 *
 * @example
 * ```tsx
 * const { user, profile, isLoading, signIn, signOut } = useAuth();
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() must be used within an <AuthProvider>. Wrap your root layout with <AuthProvider>.');
  }
  return context;
}
