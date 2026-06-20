# Session Context: Bugsok AI — Plant Health Tracker

This document captures the current state, architecture, and files of the project at the end of this session. It can be loaded in future chat sessions or by other AI agents to immediately resume development.

---

## 📅 Project Context (As of June 20, 2026)

* **App Title:** Bugsok AI
* **App Subtitle:** Plant Health Tracker
* **Operating Framework:** React Native Expo (Expo Router)
* **SDK Version:** **Expo SDK 54** (configured for compatibility with physical Expo Go testing)
* **Platform Support:** iOS, Android, and Web
* **Primary Language:** Taglish/English UI
* **Design Guidelines:** Solid green shades (Mint, Emerald, Forest) with crisp elevations, smooth concentric curves, and borders. **No glassmorphism.**
* **Custom Floating Bottom Navigation Bar**:
  * **Floating capsule bar**: absolutely positioned white bar with rounded corners and shadow.
  * **Shared Sliding Capsule**: A single active background capsule (`width: 66, height: 56`) that smoothly slides horizontally to the active tab using spring physics (`Animated.spring` on `translateX`).
  * **Morphing Corners**: Capsule border radius morphs from `32` (on edge tabs: Home and Profile) to `18` (on middle tabs: History and Chat).
  * **Elevated Scan Button**: Circular button floating above the center of the bar. It spring-scales to `1.12` and displays a looping, breathing scanner glow ring (`pulseRing`, `scale: 1.0` -> `1.45`, fading `0.5` -> `0.0` over `1800ms`) when selected.
  * **Smooth Icon & Label Transitions**: Active tabs animate the icon to scale up (`1.0` -> `1.15`) and shift upwards (`translateY: 0` -> `-5`) using spring physics, while the label is always-mounted and slides and fades in (`translateY` `8` -> `0`, opacity `0` -> `1`).
  * **Driver Conflict Isolation**: Structured as nested views (`slidingPillContainer` + `slidingPillInner`) to isolate native GPU-driven animations from JS-driven animations, preventing React Native driver conflicts.
* **Profile Header Background**: Premium linear gradient background (`['#047857', '#064e3b']`) applied using `expo-linear-gradient` to the header of the Profile screen.
* **Scan Results Health Gauge**: Circular progress indicator with a thicker bold `strokeWidth={10}` on the Scan Results screen to highlight the crop's health score.
* **Concentric Layout & Border-Radius Smoothing**:
  * **AI Toggle switch**: Outer container uses `rounded-[20px]` and inner sliding pill uses `borderRadius: 16` to deliver a perfectly aligned, smooth concentric curvature.
  * **Camera Viewport**: Replaced dashed border with solid `border-stone-300` and `rounded-[24px]` corners to prevent rendering artifacts or jagged aliasing.
  * **Hero Image Card**: Applied matching concentric border-radius layout (`rounded-[24px]` outer `BentoTile` and `rounded-[23px]` inner `View`/`Image`/overlay) to prevent corner pixel bleed.
* **Mascot Animation Custom Splash Screen**:
  * **Expo Image**: Uses `expo-image` for high-performance, hardware-accelerated rendering of the transparent animated WebP mascot (`assets/images/mascot-animation.webp`).
  * **Staggered Entrance**: Animated title "Bugsok AI" fades in at `1.0s` and the subtitle fades in at `1.5s` using native-driven opacity transitions.
  * **Automated Flow**: The entire screen fades out at `3.5s` and redirects the user to the `/login` screen at `4.0s`.

---

## 🔒 Phase 2 Enhancements (Authentication & Security)

* **Refactored Architecture & Separation of Concerns**:
  * Moved direct Supabase SDK calls out of UI screens.
  * Created dedicated service layers (`auth.service.ts`, `profile.service.ts`) and global hook context (`AuthContext.tsx`) to handle authentication status and profile fetch state.
* **Custom Toast Notification System**:
  * Designed global `ToastProvider` with physical bounce animations, dynamic colors (emerald for success, red for error, amber for warning), and an interactive shrinking progress bar detailing auto-dismiss timer.
* **Login Rate Limiter & Cooldown Lock**:
  * Added 3-strike login lockout system. If a user fails to authenticate 3 times sequentially, the login button gets locked for 60 seconds.
  * Lockout state is persisted in `AsyncStorage` to prevent bypassing via app restart.
* **Forgot Password Flow & Dynamic Password Strength**:
  * **3-Step Recovery Wizard**: `/forgot-password` route with clean layout exceptions in `_layout.tsx`.
  * **Responsive 6-Digit OTP Box Grid**: Renders 6 numeric input boxes that automatically calculate their width dynamically based on screen size. Focus moves forward automatically on keypress and backward on backspace.
  * **Animated Password Strength Meter**: Dynamic color-morphing progress bar (Red ➔ Orange ➔ Green) representing Weak, Good, or Strong values based on character rules.

---

## 📦 Phase 3: SQLite-First Offline & Bidirectional Sync Architecture

The application implements **Option C: Bidirectional Sync (SQLite-First)**. The local SQLite database serves as the primary data store, ensuring instant rendering and offline usability, with background synchronization to Supabase.

### 💾 Local SQLite Database Schema
The local database (`bugsok_ai.db`) contains three primary tables:
1. **`scans`**: Stores crop diagnoses locally. Unsynced scans store a `local_image_path`. Synced scans contain the Supabase bucket `cloud_image_url`. Includes a `synced` flag (0 = Unsynced, 1 = Synced).
2. **`chat_sessions`**: Stores follow-up chat sessions associated with scans.
3. **`chat_messages`**: Stores individual messages for each session.

* **Tagalog Database Keys**: Crops are saved in the database using their Tagalog keys (e.g. `Talong`, `Kamatis`, `Sili`, `Ampalaya`) to match the localized content rules.
* **Auto-Resume Chat Sessions**: When entering the chat screen from a scan results page, the app automatically fetches and resumes the latest active chat session for that scan instead of starting a new one.
* **Pure JavaScript UUIDs**: Replaced `expo-crypto` dynamic loading with a pure JavaScript RFC4122-compliant UUID generator to prevent Metro bundler resolution failures on Android devices.
* **DevTools Network Hook**: Added a check in `src/app/_layout.tsx` to hook `global.XMLHttpRequest` to `originalXMLHttpRequest` in `__DEV__` mode to allow Chrome DevTools (`chrome://inspect`) to capture network requests when debugging.

### 🔄 Bidirectional Synchronization Logic (`syncData`)
Whenever the app starts up, or when a user taps **"Sync Now"** in the History or Profile tab:
1. **Upload Queue**: 
   - Scans with `synced = 0` upload their local images to the `plant-images` Supabase Storage bucket, write to the Supabase database, and update SQLite to `synced = 1`.
   - Unsynced chat sessions and messages are pushed to Supabase tables.
2. **Download Delta**: 
   - Queries Supabase for new/updated scans, chat sessions, and messages matching the logged-in user.
   - Merges missing records into local SQLite tables using `ON CONFLICT(id) DO UPDATE`.

---

## 🛠️ Technology Stack & Dependencies

* **Core:** React 19.1.0, React Native 0.81.5
* **Navigation:** Expo Router (file-based stack & tabs under `src/app`)
* **Database:** **expo-sqlite** (`~16.0.10`) for local storage
* **Cloud backend:** **@supabase/supabase-js** (`^2.108.2`) for authentication, database, and storage buckets
* **Styling:** **NativeWind v4** (Tailwind CSS for React Native) compiled with `react-native-reanimated` plugin
* **Typography:** **Fredoka** Google Font family (loaded asynchronously using `expo-font`)
* **Icons:** **Lucide Icons** (`lucide-react-native`) and **Ionicons** (`@expo/vector-icons`)
* **Media Rendering:** **expo-image** (for rendering transparent animated WebP on splash screen)
* **Local Storage:** `@react-native-async-storage/async-storage` for persisting login cooldown states.

---

## 📂 Core Directory Structure

```
Cloud-Based Plant Health AI Assistant - Mobile Application/
├── assets/
│   ├── data/
│   │   └── vegetables_db.json       # Crop database context (~143KB)
│   └── images/
│       ├── mascot-animation.webp    # Bundled transparent animated WebP mascot splash animation (4.0s)
│       └── mascot-logo.jpeg         # App mascot image (square with 12px rounded radius)
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # Root Layout (Loads Fredoka font, wraps providers, Chrome DevTools network hook)
│   │   ├── index.tsx                # App entry redirect (routes to /splash)
│   │   ├── splash.tsx               # Staggered fade-in splash screen with transparent WebP animation
│   │   ├── login.tsx                # Redesigned login with mascot logo, lockout timer, & custom toast alerts
│   │   ├── register.tsx             # Redesigned registration screen with password strength progress bar
│   │   ├── forgot-password.tsx      # 3-step secure password recovery wizard (Email, 6-digit OTP, Strength-tested Reset)
│   │   ├── scan-results.tsx         # Bento Grid Detailed Diagnosis Dashboard loading data by ID from SQLite/Supabase
│   │   ├── chat.tsx                 # Follow-up chat conversation screen querying SQLite logs & saving to SQLite/Supabase
│   │   └── (tabs)/
│   │       ├── _layout.tsx          # Custom Tab bar layout (integrates CustomTabBar)
│   │       ├── index.tsx            # Home Dashboard (Live counts from SQLite stats, recent scans list, tips)
│   │       ├── history.tsx          # Past scans (Search, filter, offline sync status, manual "Sync Now" banner)
│   │       ├── scan.tsx             # Camera preview guidelines frame with solid rounded-[24px] border, custom sliding AI mode toggle
│   │       └── profile.tsx          # User profile info, SQLite vs Supabase counts, and sync dashboard
│   ├── components/
│   │   ├── BentoGrid.tsx            # Bento layout tiles (colSpan helper wrapper)
│   │   ├── CircularProgress.tsx     # SVG progress circle matching health severity
│   │   └── CustomTabBar.tsx         # Shared sliding pill floating bottom tab bar with pulse rings
│   ├── context/
│   │   ├── AuthContext.tsx          # Global auth state provider (exposes session, profile, and recovery helpers)
│   │   ├── ScanContext.tsx          # Scan provider (initializes SQLite db and persists scanned diagnoses)
│   │   └── ToastContext.tsx         # Global Custom Toast context provider (exposes toast view states & animations)
│   ├── services/
│   │   ├── auth.service.ts          # Supabase authentication service calls wrapper
│   │   ├── profile.service.ts       # Profiles database & avatars storage calls wrapper
│   │   ├── scan.service.ts          # SQLite-First operations, Supabase bucket uploads, and bidirectional sync
│   │   └── api.service.ts           # Supabase Edge Function proxy API (classifyCrop, diagnoseCrop, SSE streaming with JWT verification)
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript interfaces and typings
│   ├── constants/
│   │   └── theme.ts                 # Theme layout values, colors, spacing definitions
│   └── hooks/
│       └── use-theme.ts             # Theme color mapping hook
├── babel.config.js                  # Babel presets for Expo and NativeWind v4
├── metro.config.js                  # Metro bundler compilation wrapper for NativeWind
├── nativewind-env.d.ts              # TypeScript environment typings for NativeWind className props
├── package.json                     # Pinned package versions for Expo SDK 54 compatibility
└── tsconfig.json                    # TypeScript compiler options (strict, baseUrl = .)
```

---

## 🚀 Current Project Status & Commands

1. **Phase 2, 3, & 4 Completion**: **Fully Completed, Verified, and Synced to GitHub**.
   * Auth, profile management, and avatars are fully wired with Supabase.
   * Scans, chat sessions, and message logs are saved locally to SQLite first, providing offline support.
   * Bidirectional sync is completed and successfully verified.
   * Backend Go proxy was migrated to a serverless Supabase Edge Function (`proxy`) with Deno/TypeScript, using native zero-dependency REST requests to avoid 503 load issues.
   * Added Gemini model `gemma-4-26b-a4b-it` support for deep reasoning/thinking modes.
   * Secured API endpoints using Supabase JWT verification on the gateway level and appended active session tokens to the mobile app request headers.
2. **Git Repository Status**: 
   * Committed and pushed to remote repository (`master` branch).
   * Commit Message: `"Enforce JWT for proxy"`.
3. **Compilation Status**: Verified with `npx tsc --noEmit` which completes with **0 errors**.
4. **Dev Server Command**:
   ```bash
   npx expo start -c
   ```
5. **Platform Previews**:
   * **Mobile Device (Expo Go)**: Scan the Metro QR code inside the **Expo Go** application (version matching SDK 54).
   * **Hermes/Network Debugger**: Chrome DevTools (`chrome://inspect`) target `localhost:8081` connects to the running app. The `XMLHttpRequest` override allows inspection of network traffic in the Chrome DevTools network panel.
