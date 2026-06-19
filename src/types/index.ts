/**
 * Bugsok AI — Shared TypeScript Type Definitions
 *
 * Central type definitions shared across services, context providers,
 * and UI screens. Keeps types consistent and avoids duplication.
 */

import type { Session, User } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// Database Table Types
// ─────────────────────────────────────────────

/** Row shape from the `profiles` table. */
export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  birthdate: string | null;
  updated_at: string;
}

/** Data payload for updating a user profile. */
export interface UpdateProfileData {
  username?: string;
  full_name?: string;
  avatar_url?: string | null;
  gender?: 'Male' | 'Female' | 'Other';
  birthdate?: string;
}

// ─────────────────────────────────────────────
// Auth Context Types
// ─────────────────────────────────────────────

/** The global auth state exposed by `useAuth()`. */
export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

/** Methods exposed by the `useAuth()` hook. */
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ user: User | null; error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** Combined shape of the AuthContext value. */
export type AuthContextValue = AuthState & AuthActions;

// ─────────────────────────────────────────────
// API / Service Types (Phase 3 placeholders)
// ─────────────────────────────────────────────

/** A single message in a chat conversation. */
export interface ChatMessage {
  role: 'user' | 'model' | 'assistant' | 'ai';
  content: string;
}

/** Response from the /classify endpoint. */
export interface ClassifyResponse {
  crop: string;
}

/** A single SSE chunk from the /diagnose or /chat stream. */
export interface StreamChunk {
  text?: string;
  error?: string;
}
