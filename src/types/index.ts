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
  isRegistering: boolean;
}

/** Methods exposed by the `useAuth()` hook. */
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ user: User | null; error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setIsRegistering: (val: boolean) => void;
  sendResetEmail: (email: string) => Promise<{ error: string | null }>;
  verifyRecoveryCode: (email: string, code: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
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
  matched: boolean;
}

/** A single SSE chunk from the /diagnose or /chat stream. */
export interface StreamChunk {
  text?: string;
  error?: string;
  crop?: string;
}

// ─────────────────────────────────────────────
// Scan / Diagnosis Context Types
// ─────────────────────────────────────────────

/** Fully parsed diagnosis result from the AI streaming response. */
export interface DiagnosisResult {
  cropLocalName: string;
  cropScientificName: string;
  category: string;
  ecologicalStatus: string;
  condition: string;
  severity: 'None' | 'Low' | 'Moderate' | 'High';
  healthScore: number;          // 0–100
  confidenceScore: number;      // 0–100
  wateringFrequency: string;
  wateringDescription: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  careTip: string;
  imageUri: string;             // Local URI of the scanned leaf image
}

/** The global scan state. */
export interface ScanState {
  isScanning: boolean;
  scanPhase: 'idle' | 'classifying' | 'diagnosing' | 'done' | 'error';
  scannedImageUri: string | null;
  activeModel: 'flash' | 'deep';
  identifiedCrop: string | null;
  diagnosisResult: DiagnosisResult | null;
  errorMessage: string | null;
  loadingCaption: string;
  lastSavedScanId: string | null;
}

/** Methods exposed by the ScanContext provider. */
export interface ScanActions {
  startScan: (imageUri: string, model: 'flash' | 'deep') => void;
  cancelScan: () => void;
  clearResults: () => void;
}

/** Combined shape of the ScanContext value. */
export type ScanContextValue = ScanState & ScanActions;

