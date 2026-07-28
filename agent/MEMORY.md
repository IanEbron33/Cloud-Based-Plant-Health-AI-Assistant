# Session Context: Bugsok AI — Plant Health Tracker

This document captures the current state, architecture, and files of the project at the end of this session. It can be loaded in future chat sessions or by other AI agents to immediately resume development.

---

## 📅 Project Context (As of July 28, 2026)

* **App Title:** Bugsok AI
* **App Subtitle:** Plant Health Tracker
* **Operating Framework:** React Native Expo (Expo Router)
* **SDK Version:** **Expo SDK 54** (configured for compatibility with physical Expo Go/Dev Client testing)
* **Platform Support:** iOS, Android, and Web
* **Primary Language:** Taglish/English UI
* **Design Guidelines:** Solid green shades (Mint, Emerald, Forest) with crisp elevations, smooth concentric curves, and borders. **No glassmorphism.** Only Light Theme is active.
* **Custom Floating Bottom Navigation Bar**:
  * **Floating capsule bar**: absolutely positioned white bar with rounded corners and shadow.
  * **Shared Sliding Capsule**: A single active background capsule (`width: 66, height: 56`) that smoothly slides horizontally to the active tab using spring physics (`Animated.spring` on `translateX`).
  * **Morphing Corners**: Capsule border radius morphs from `32` (on edge tabs: Home and Profile) to `18` (on middle tabs: History and Chat).
  * **Elevated Scan Button**: Circular button floating above the center of the bar. It spring-scales to `1.12` and displays a looping, breathing scanner glow ring (`pulseRing`, `scale: 1.0` -> `1.45`, fading `0.5` -> `0.0` over `1800ms`) when selected.
  * **Smooth Icon & Label Transitions**: Active tabs animate the icon to scale up (`1.0` -> `1.15`) and shift upwards (`translateY: 0` -> `-5`) using spring physics, while the label is always-mounted and slides and fades in (`translateY` `8` -> `0`, opacity `0` -> `1`).
  * **Driver Conflict Isolation**: Structured as nested views (`slidingPillContainer` + `slidingPillInner`) to isolate native GPU-driven animations from JS-driven animations, preventing React Native driver conflicts.
  * **Z-Index Overlay Resolution**: Automatically unmounts (`returns null`) when screen options specify `tabBarStyle.display = 'none'` (triggered dynamically when delete modals, resolve modals, or the sidebar drawer are active).
  * **Mount Entrance Animation**: Applies a parallel fade-in (opacity `0` ➔ `1`) and slide-up (translateY `25` ➔ `0`) transition over `250ms` when mounting back onto the viewport.
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

## 🔒 Authentication & Login Layout Refactoring

* **Refactored Architecture & Separation of Concerns**:
  * Moved direct Supabase SDK calls out of UI screens.
  * Created dedicated service layers (`auth.service.ts`, `profile.service.ts`) and global hook context (`AuthContext.tsx`) to handle authentication status and profile fetch state.
* **Redesigned Modern Seamless Card-Free Login Screen**:
  * **Card-Free Structure**: Removed the heavy white outer card box container (`p-6 rounded-[32px] border bg-white shadow-sm`) in `src/app/login.tsx` so inputs and buttons rest seamlessly directly on the `bg-stone-50` background.
  * **Compact Mascot Header**: Scaled top mascot logo badge from `w-28 h-28` (112px) to `w-20 h-20` (80px x 80px) and reduced bottom margin from `mb-10` to `mb-6`, saving ~50px of top viewport space.
  * **Optimized Vertical Padding**: Refined input padding (`py-3.5`) and field margins (`mb-3.5`, `mb-2.5`) so all form fields, buttons, and the bottom internet connection disclaimer fit comfortably on standard mobile viewports without clipping.
  * **Fredoka Typography**: Strictly styled using the app's `Fredoka` font system (`font-fredoka` / `Fredoka_700Bold`) matching `DESIGN.md`.
* **Custom Toast Notification System**:
  * Designed global `ToastProvider` with physical bounce animations, dynamic colors (emerald for success, red for error, amber for warning), and an interactive shrinking progress bar detailing auto-dismiss timer.
* **Login Rate Limiter & Cooldown Lock**:
  * Added 3-strike login lockout system. If a user fails to authenticate 3 times sequentially, the login button gets locked for 60 seconds.
  * Lockout state is persisted in `AsyncStorage` to prevent bypassing via app restart.
* **Forgot Password Flow & Dynamic Password Strength**:
  * **3-Step Recovery Wizard**: `/forgot-password` route with clean layout exceptions in `_layout.tsx`.
  * **Responsive 6-Digit OTP Box Grid**: Renders 6 numeric input boxes that automatically calculate their width dynamically based on screen size. Focus moves forward automatically on keypress and backward on backspace.
  * **Animated Password Strength Meter**: Dynamic color-morphing progress bar (Red ➔ Orange ➔ Green) representing Weak, Good, or Strong values based on character rules.
* **Native Google Sign-In (Supabase Google Auth)**:
  * **OAuth Configuration**: Integrated `@react-native-google-signin/google-signin` library to handle native credential prompts on Android/iOS. Added the config plugin to `app.json`.
  * **Auth Flow Integration**: Added `signInWithGoogleIdToken` in `auth.service.ts`, initialized `GoogleSignin` on mount in `AuthContext.tsx`, and passed `signInWithGoogle` down to components.
  * **Auto-Profile Creation**: On first-time Google logins, the app automatically copies the user's Google `full_name` and `avatar_url` to initialize/update their row in the `profiles` table.
  * **Clean Sign-Out**: Modified the context `signOut` method to clean up the cached Google login session via `GoogleSignin.signOut()`, preventing automatic auto-login loops and forcing account picker display on next login.

---

## 🏠 Home Screen Mascot Greeting Logic

* **Context-Aware Mascot Greetings**:
  * **0 Scans (Onboarding Welcome State)**: When `stats.total === 0` (no scan history), Bugsok selects from `welcomeGreetings` (*"Welcome to Bugsok AI! Take your first crop scan to start monitoring plant health."* / *"Ready to check your plants? Tap the Scan button below to analyze a crop leaf."*) and displays `mascot-happy.png`.
  * **1+ Scans (All Healthy)**: When `stats.total > 0` and no active infections exist, Bugsok selects from `healthyGreetings` (*"All your plants are looking healthy! Keep up the good work."*) and displays `mascot-happy.png`.
  * **1+ Scans (Warning State)**: When `highestSeverity` is `'Low'` or `'Moderate'`, Bugsok selects from `warningGreetings` and displays `mascot-concerned.png`.
  * **1+ Scans (Critical State)**: When `highestSeverity` is `'High'`, Bugsok selects from `criticalGreetings` and displays `mascot-worried.png`.

---

## 💾 Local SQLite Database & Sync Architecture (SQLite-First)

The application implements **Option C: Bidirectional Sync (SQLite-First)**. The local SQLite database serves as the primary data store, ensuring instant rendering and offline usability, with background synchronization to Supabase.

### Local SQLite Database Schema
The local database (`bugsok_ai.db`) has been normalized down to **three primary tables**:
1. **`scans`**: Stores crop diagnoses locally. Unsynced scans store a `local_image_path`. Synced scans contain the Supabase bucket `cloud_image_url`. Includes a `synced` flag (0 = Unsynced, 1 = Synced), and an `is_resolved` flag (0 = Active, 1 = Resolved).
2. **`chat_sessions`**: Groups message logs for both scan follow-up chats and general chats (where `scan_id` is `null`). Contains an `is_pinned` column for pinned sessions. Has a foreign key references `scans(id) ON DELETE CASCADE`.
3. **`chat_messages`**: Stores individual message bubbles for all chat sessions. Supports crop profile attachments via a nullable `attached_scan_id` column.

* **Self-Healing SQLite Schema**: SQLite database initialization in `scan.service.ts` queries table info and dynamically executes columns update DDL (`ALTER TABLE scans ADD COLUMN is_resolved INTEGER DEFAULT 0`) if missing.
* **Foreign Key Cascades**: SQLite database schema handles cascade deletions. Deleting a crop scan automatically clears out all associated `chat_sessions` and `chat_messages` locally.
* **Tagalog Database Keys**: Crops are saved in the database using their Tagalog keys (e.g. `Talong`, `Kamatis`, `Sili`, `Ampalaya`) to match the localized content rules.
* **Auto-Resume Chat Sessions**: When entering the chat screen from a scan results page, the app automatically fetches and resumes the latest active chat session for that scan instead of starting a new one.

---

## ⚡ Optimized 720p Scan Pipeline & Go Proxy Logging

To optimize scanning latency and cloud storage consumption, the scan pipeline uses 720p pre-compression with backend Go proxy logging.

### Client-Side 720p Pre-Compression
* **Implementation**: Uses `expo-image-manipulator` in `ScanContext.tsx` before sending images to the proxy/Supabase.
* **Resolution**: Downscales images to a maximum width of `720px` (`width: 720`) with `60% JPEG quality`.
* **Latency & Storage Benefits**: Reduces photo payload sizes by ~60% (from ~450–600 KB down to **~150–200 KB** per scan), doubling upload speed over cellular networks without impacting AI diagnostic accuracy. Saves significant long-term Supabase Storage bucket space.

### Go Backend Proxy (`proxy/scan.go`)
* **Hugging Face Space Endpoint**: Runs on `https://ianpatatas-bugsok-ai.hf.space`.
* **Payload Size Logging**: Logs incoming scan payload sizes in KB (`log.Printf("[Scan] Received scan image payload: %d KB (%s)\n")`) to monitor proxy bandwidth throughput.
* **Single SSE Stream**: Handles classification and diagnosis in a single SSE stream to eliminate extra network round-trips.

---

## 🔍 Diagnosis History & Funnel Filter Bottom Sheet Drawer

We refactored the Diagnosis History screen ([history.tsx](file:///c:/Users/ADMIN/Desktop/Folder1/Cloud-Based%20Plant%20Health%20AI%20Assistant%20-%20Mobile%20Application/src/app/%28tabs%29/history.tsx)) to replace cluttered stacked filter bars with a clean **Funnel Filter Icon + Bottom Sheet Drawer** layout:

* **Integrated Search & Funnel Icon Bar**:
  * Replaced >200px of stacked filter bars with a single integrated search row: Search input + **Funnel Filter Toggle Icon Button** (`options-outline`).
  * Displays an active notification badge dot on the funnel icon whenever non-default filters are active.
* **Active Filter Summary Strip**:
  * Renders a compact active filter badge strip directly below search (e.g., `Filter: Active • Infected`) with a 1-tap `Reset` action.
* **Filter Bottom Sheet Drawer Modal**:
  * Tapping the Funnel button slides up a native bottom sheet drawer containing:
    * **Status**: *Active*, *Resolved*, *All*
    * **Condition Type**: *All*, *Healthy*, *Infected*, *Unsynced*
    * **Sort Order**: *Newest First*, *Oldest First*, *Lowest Health %*, *Highest Health %*
    * Action footer with `Reset All` and emerald `Apply Filters` CTA button.
* **Reclaimed Viewport Space**:
  * Reclaims >150px of vertical space, showing diagnosis history cards immediately below search.
* **Cascade Delete & Resolved Modals**:
  * Tapping **"Delete Scan"** triggers a cascade delete: removes local database rows in `scans` (which cascades to wipe `chat_sessions` and `chat_messages` locally), invokes Supabase DB record deletions, and deletes the image asset in Supabase Storage.
  * Modals use spring physics and emotional mascot assets (`mascot-happy.png` for Resolve, `mascot-concerned.png` for Reactivate, and `mascot-transparent-sad.png` for Delete).
* **Z-Index Tab Bar Management**:
  * Dynamically hides bottom tab bar (`tabBarStyle.display = 'none'`) whenever any modal (Delete, Resolve, Reactivate, or Funnel Filter) is open.

---

## 💬 Follow-up Chat System & Assistant UX

* **Header Redesign**: Left-aligned layout consisting of `[Back Button] [Mascot Avatar] [Bugsok AI Title, Condition Status Badge, and Follow Up Subtitle] [Green Trash Button]`.
* **Auto-Growing Input Box**: Multiline text area (`minHeight: 38`, `maxHeight: 120`) styled as `rounded-[22px]`.
* **Custom Delete Confirmation Modal**: Centered modal carrying `mascot-transparent-sad.png` scaled to `130x130`.
* **Strict English-Only Prompting**: Backend Go proxy chatbot instructions force purely English responses.
* **Advanced Markdown Parser**:
  * Double asterisks (`**bold text**`) rendered in **bold emerald green**.
  * Single asterisks (`*italic accent*`) rendered in **bold-italic soft mint green**.
  * Bullet lists formatted as circular bullet points (`• `).
* **Dynamic Thinking Indicator**: In Deep Think mode, cycles through reasoning stages every 2.5s (*"Bugsok is analyzing the crop symptoms..."*, *"Bugsok is formulating treatment options..."*).

---

## 💬 General Chat Tab & Attachment System

* **Model Switcher**: Header switcher toggling between `Flash` (low latency, 256 token limit) and `Deep` (detailed reasoning, 1024 token limit).
* **Left-Sliding Sidebar**: Burger menu button opens a left-sliding sidebar for navigating, creating (`+ New Chat`), pinning, or deleting chat sessions.
* **User Profile Footer**: Anchored at the bottom of the sidebar with user avatar, name, and settings cog link to Profile.
* **Option A Attachment System**: Clip icon `📎` opens past scans picker sheet. Selecting a scan locks it as a context chip above the input box and injects diagnosis metadata into the AI context stream.
* **Scope Guardrails**: Rejects non-agricultural prompts (programming, math formulas) to keep the app focused on plant health.

---

## 🛠️ Technology Stack & Dependencies

* **Core:** React 19.1.0, React Native 0.81.5
* **Navigation:** Expo Router (file-based stack & tabs under `src/app`)
* **Database:** **expo-sqlite** (`~16.0.10`) for local storage
* **Cloud backend:** **@supabase/supabase-js** (`^2.108.2`) for authentication, database, and storage buckets
* **Styling:** **NativeWind v4** (Tailwind CSS for React Native) compiled with `react-native-reanimated` plugin
* **Typography:** **Fredoka** Google Font family (loaded asynchronously using `expo-font`)
* **Icons:** **Lucide Icons** (`lucide-react-native`) and **Ionicons** (`@expo/vector-icons`)
* **Media Rendering:** **expo-image** (for splash WebP animation)
* **Image Compression**: **expo-image-manipulator** (`~13.0.5`) for 720p client-side resizing
* **Local Storage:** `@react-native-async-storage/async-storage` for login lockout states

---

## 📂 Core Directory Structure

```
Cloud-Based Plant Health AI Assistant - Mobile Application/
├── assets/
│   ├── data/
│   │   └── vegetables_db.json       # Crop database context (~143KB)
│   └── images/
│       ├── mascot-animation.webp    # Bundled transparent animated WebP mascot splash animation (4.0s)
│       ├── mascot-logo.png          # App mascot image (512x512 high quality square PNG)
│       ├── mascot-happy.png         # Happy mascot asset
│       ├── mascot-concerned.png     # Concerned mascot asset
│       ├── mascot-worried.png       # Worried mascot asset
│       └── mascot-transparent-sad.png # Sad transparent mascot for delete modal
├── agent/
│   ├── DESIGN.md                    # Official UI design guidelines & Fredoka typography specs
│   ├── MEMORY.md                    # Active session context & architecture blueprint
│   ├── SKILLS.md                    # Mandatory agent rules & guidelines
│   └── System Planning Blueprint.md # Full system architecture document
├── proxy/
│   ├── Dockerfile                   # Multi-stage Docker config for HF Spaces
│   ├── README.md                    # Backend run & deployment instructions
│   ├── chat.go                      # SSE follow-up chat endpoint
│   ├── gemini.go                    # Shared Gemini API calling and stream handlers
│   ├── go.mod                       # Go 1.22 module definition
│   ├── scan.go                      # SSE unified classification & diagnosis endpoint (with payload size logging)
│   └── main.go                      # Entry point, routing, and CORS middleware
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # Root Layout (Loads Fredoka font, wraps providers, Chrome DevTools network hook)
│   │   ├── index.tsx                # App entry redirect (routes to /splash)
│   │   ├── splash.tsx               # Staggered fade-in splash screen with transparent WebP animation
│   │   ├── login.tsx                # Seamless card-free login screen with mascot header & lockout timer
│   │   ├── register.tsx             # Registration wizard with password strength progress bar
│   │   ├── forgot-password.tsx      # 3-step secure password recovery wizard
│   │   ├── scan-results.tsx         # Bento Grid Detailed Diagnosis Dashboard
│   │   ├── chat.tsx                 # Follow-up chat conversation screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx          # Custom Tab bar layout (integrates CustomTabBar)
│   │       ├── index.tsx            # Home Dashboard (Mascot welcome greetings for 0 scans, scan stats, daily tips)
│   │       ├── history.tsx          # Past scans (Search + Funnel filter drawer modal, active filter strip)
│   │       ├── scan.tsx             # Camera preview with 720p pre-compression & AI mode toggle
│   │       ├── chat.tsx             # General Chat tab screen with Flash/Deep switcher & scan history picker modal
│   │       └── profile.tsx          # User profile info, SQLite vs Supabase counts, & sync dashboard
│   ├── components/
│   │   ├── BentoGrid.tsx            # Bento layout tiles
│   │   ├── CircularProgress.tsx     # SVG progress circle matching health severity
│   │   └── CustomTabBar.tsx         # Shared sliding pill floating bottom tab bar with pulse rings
│   ├── context/
│   │   ├── AuthContext.tsx          # Global auth state provider
│   │   ├── ScanContext.tsx          # Scan provider (720p compression, SQLite init, SSE streaming)
│   │   └── ToastContext.tsx         # Global Custom Toast context provider
│   ├── services/
│   │   ├── auth.service.ts          # Supabase authentication service wrapper
│   │   ├── profile.service.ts       # Profiles database & avatars storage wrapper
│   │   ├── scan.service.ts          # SQLite-First operations, Supabase bucket uploads, & bidirectional sync
│   │   └── api.service.ts           # Go proxy API helper
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript interfaces and typings
│   └── constants/
│       └── theme.ts                 # Theme layout values, colors, spacing definitions
├── babel.config.js                  # Babel presets for Expo and NativeWind v4
├── metro.config.js                  # Metro bundler compilation wrapper for NativeWind
├── package.json                     # Pinned package versions for Expo SDK 54 compatibility
└── tsconfig.json                    # TypeScript compiler options
```

---

## 🚀 Project Status & Commands

1. **Compilation Status**: Verified clean compilation.
2. **Dev Server Command**:
   ```bash
   npx expo start
   ```
3. **Debugging Target**: Chrome DevTools (`chrome://inspect`) target `localhost:8081` for Hermes network inspection.
