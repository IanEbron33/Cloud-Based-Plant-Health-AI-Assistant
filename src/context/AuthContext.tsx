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
import { fetchUserProfile } from '../services/profile.service';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    await authService.signOut();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
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
