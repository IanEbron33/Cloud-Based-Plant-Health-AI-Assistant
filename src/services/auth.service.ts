/**
 * Bugsok AI — Auth Service
 *
 * Wraps all Supabase authentication calls into clean, testable functions.
 * UI screens should never import `supabase` directly for auth operations —
 * they should use the `useAuth()` hook or call these service functions.
 */

import { supabase } from '../lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * Sign in an existing user with email and password.
 * @returns The session data, or an error message.
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    session: data.session,
    user: data.user,
    error: error?.message ?? null,
  };
};

/**
 * Register a new user with email, password, and full name metadata.
 * Supabase will auto-create a `profiles` row via the database trigger.
 * @returns The created user, or an error message.
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return {
    user: data.user,
    session: data.session,
    error: error?.message ?? null,
  };
};

/**
 * Sign out the currently authenticated user.
 * Clears the persisted session from AsyncStorage.
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Sign out error:', error.message);
  }
};

/**
 * Retrieve the currently stored session (JWT + user).
 * Returns null if no active session exists.
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('Get session error:', error.message);
    return null;
  }
  return data.session;
};

/**
 * Subscribe to auth state change events (sign-in, sign-out, token refresh).
 * @returns An unsubscribe function to clean up the listener.
 */
export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
};

/**
 * Request a password reset OTP code via email.
 */
export const sendPasswordResetEmail = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error: error?.message ?? null };
};

/**
 * Verify recovery OTP code sent to user email.
 */
export const verifyRecoveryOtp = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });
  return {
    session: data.session,
    user: data.user,
    error: error?.message ?? null,
  };
};

/**
 * Update the password of the currently authenticated session user.
 */
export const updateUserPassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password,
  });
  return {
    user: data.user,
    error: error?.message ?? null,
  };
};
