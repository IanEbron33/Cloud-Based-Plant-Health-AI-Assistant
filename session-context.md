# Session Context: Bugsok AI — Plant Health Tracker

This document captures the current state, architecture, and files of the project at the end of this session. It can be loaded in future chat sessions or by other AI agents to immediately resume development.

---

## 📅 Project Context (As of June 23, 2026)

* **App Title:** Bugsok AI
* **App Subtitle:** Plant Health Tracker
* **Operating Framework:** React Native Expo (Expo Router)
* **SDK Version:** **Expo SDK 54** (configured for compatibility with physical Expo Go/Dev Client testing)
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

## 💾 Local SQLite Database & Sync Architecture (SQLite-First)

The application implements **Option C: Bidirectional Sync (SQLite-First)**. The local SQLite database serves as the primary data store, ensuring instant rendering and offline usability, with background synchronization to Supabase.

### Local SQLite Database Schema
The local database (`bugsok_ai.db`) contains three primary tables:
1. **`scans`**: Stores crop diagnoses locally. Unsynced scans store a `local_image_path`. Synced scans contain the Supabase bucket `cloud_image_url`. Includes a `synced` flag (0 = Unsynced, 1 = Synced).
2. **`chat_sessions`**: Stores follow-up chat sessions associated with scans.
3. **`chat_messages`**: Stores individual messages for each session.

* **Tagalog Database Keys**: Crops are saved in the database using their Tagalog keys (e.g. `Talong`, `Kamatis`, `Sili`, `Ampalaya`) to match the localized content rules.
* **Auto-Resume Chat Sessions**: When entering the chat screen from a scan results page, the app automatically fetches and resumes the latest active chat session for that scan instead of starting a new one.
* **Pure JavaScript UUIDs**: Replaced `expo-crypto` dynamic loading with a pure JavaScript RFC4122-compliant UUID generator to prevent Metro bundler resolution failures on Android devices.
* **DevTools Network Hook**: Added a check in `src/app/_layout.tsx` to hook `global.XMLHttpRequest` to `originalXMLHttpRequest` in `__DEV__` mode to allow Chrome DevTools (`chrome://inspect`) to capture network requests when debugging.

### Bidirectional Synchronization Logic (`syncData`)
Whenever the app starts up, or when a user taps **"Sync Now"** in the History or Profile tab:
1. **Upload Queue**: 
   - Scans with `synced = 0` upload their local images to the `plant-images` Supabase Storage bucket, write to the Supabase database, and update SQLite to `synced = 1`.
   - Unsynced chat sessions and messages are pushed to Supabase tables.
2. **Download Delta**: 
   - Queries Supabase for new/updated scans, chat sessions, and messages matching the logged-in user.
   - Merges missing records into local SQLite tables using `ON CONFLICT(id) DO UPDATE`.

---

## ⚡ Optimized Scan Pipeline (Unified Single SSE Call + Compression)

To optimize scanning latency, the pipeline has been refactored from a sequential two-step call structure (Classify ➔ Diagnose) into a unified single SSE call with client-side image compression.

### Client-Side Image Compression
* **Implementation**: Uses `expo-image-manipulator` in `ScanContext.tsx` before sending images to the backend.
* **Mechanism**: Downscales large images to a maximum width of `1024px` and compresses them to `50% JPEG quality`.
* **Latency Benefit**: Reduces raw photo sizes (up to 30MB) down to **200–500KB** (~60–150× smaller), significantly accelerating upload time over mobile networks without impacting AI diagnostic accuracy.

### Unified `/scan` Backend Endpoint (Golang on Hugging Face Spaces)
The AI proxy backend runs on **Hugging Face Spaces** (`https://ianpatatas-bugsok-ai.hf.space`).
* **Endpoints**:
  - `GET /health`: Server health checks.
  - `POST /scan`: Unified endpoint. Processes classification and diagnosis in a single API call to minimize network round-trips.
  - `POST /chat`: Follow-up chatbot discussion (SSE stream).
* **Model Routing**:
  - Automatically resolves model preferences: `gemini-3.1-flash-lite` for "flash" and `gemma-4-31b-it` (or environment custom) for "deep".
  - A single model handles both steps inside the unified `/scan` call.
* **First-Line Buffer Strategy**:
  - The Go server instructs Gemini to output `CLASSIFY: [CropName]` on the first line, followed by the structured diagnosis.
  - The proxy buffers and parses the first line to identify the crop and perform fuzzy matching against supported crops.
  - If classification matches a supported crop, the server sends a `{ "crop": "Talong" }` SSE event to transition the app's UI, then streams the remaining diagnostic text directly.
* **Non-Plant Rejection**:
  - If the first line reads `CLASSIFY: NOT_A_PLANT` or does not match supported crops, the server streams an error early, causing the client app to halt and display a warning toast.
* **Low-Confidence Warning**:
  - If a scan completes with a confidence score under 20%, the completion toast is styled as a yellow warning (`Low Confidence Scan`), and a persistent warning banner is rendered above the BentoGrid in `scan-results.tsx` prompting a retake.

---

## 💬 Follow-up Chat System & Assistant UX

The follow-up chat is fully localized and styled to support interactive, structured diagnostic consultations:

* **Header Redesign (Option A Layout)**: Left-aligned layout consisting of `[Back Button] [Mascot Avatar] [Bugsok AI Title, Condition Status Badge, and Follow Up Subtitle] [Green Trash Button]`. The subtitle "Follow Up" is aligned directly below the status badge, and the trash button uses emerald green (`#10b981`).
* **Auto-Growing Message Input Box**: Standard input converted to a multiline text area (`minHeight: 38`, `maxHeight: 120`) styled as a rounded rectangle (`rounded-[22px]`). Layout aligns wrapper items to `items-end` to keep the Send button aligned at the bottom-right as the input area expands vertically.
* **Custom Delete Confirmation Modal**: Custom overlay replacing standard OS alert notifications. Features a semi-transparent black backdrop (`bg-black/60`) and a centered card carrying the transparent `mascot-transparent-sad.png` scaled up to `130x130`, with a warning details body and Cancellation/Clear button actions.
* **Smooth Overlay Transitions**: 
  - Timing-based 180-degree rotation transition on the chevron icon in the AI Mode Switcher.
  - Dropdown options menu slides down and fades in over 200ms when opened, and transitions back up and fades out over 150ms when closed before unmounting.
  - Delete modal backdrop fades in, and the card container smoothly scales up from `0.9` to `1.0` using timing-based quadratic ease-out transitions (`Easing.out(Easing.quad)`) over 200ms to prevent spring bounces.
* **High-Quality 512x512 PNG Mascot Logo**: Resized the original square mascot icon to a high-quality `512x512` PNG at `assets/images/mascot-logo.png` and updated all config references in `app.json` (`icon`, `ios.icon`, `android.adaptiveIcon.foregroundImage`, `web.favicon`, splash screen image) to prevent launcher scaling and compression artifacts.
* **SQLite Context Lookup**: Ensures chat sessions loaded from history pull correct metadata (e.g. crop name `Sili`, condition `Downy Mildew`) directly from SQLite records (`fetchScanById`), resolving default fallback errors.
* **Strict English-Only Prompting**: Backend Go proxy chatbot instructions force the model to output purely English responses, eliminating Taglish mixtures or random dialect switches.
* **Advanced Text Styling Parser**: Client-side parser in `chat.tsx` processes raw markdown markers and transforms them:
  * Double asterisks (`**bold text**`) are rendered in **bold emerald green**.
  * Single asterisks (`*italic accent*` e.g., culinary recipes like `*Tinola*`, `*Sinigang*`) are rendered in **bold-italic soft mint green**.
  * Standard bullet lists are converted dynamically to circular bullet points (`• `).
* **Snappy Typewriter Animation**: Custom chunk-based typing simulator increments in chunks of `4` characters per frame tick (reducing latency for paragraph loads to 2–3s) and schedules scrolling updates only every `12` characters to eliminate layout layout-calculation jitter.
* **Bugsok AI Branding**: Renders a `"Bugsok AI"` name label tag above all chatbot messages and loaders, aligned side-by-side with the Mascot profile avatar.
* **Retroactive Greeting Migration**: Dynamically replaces historical greeting texts (`"Hello! I am your plant care assistant"` or `"Bugsok AI, your crops care assistant"`) with the updated `"Hello! I am Bugsok AI, as your plant care assistant"` string during list mapping. This ensures that even existing chat sessions saved in the local SQLite database reflect the latest branding instantly without needing to clear local data.
* **Dynamic Loading/Thinking Indicator**: The typing indicator adapts based on the active model. In Flash mode, it displays `"Bugsok is typing..."`. In Deep mode, since reasoning takes longer, it dynamically cycles through reasoning stages every 2.5s (e.g. `"Bugsok is analyzing the crop symptoms..."`, `"Bugsok is in deep thinking..."`, `"Bugsok is formulating treatment options..."`) to keep the user engaged.
* **Differentiated Chat Modes**:
  - **Flash Mode (⚡)**: Designed for low latency. Generates short, concise responses (exactly 2–4 sentences), uses 1–2 agricultural/farming emojis, does not ask follow-up questions, allows brief bullet points/lists, and sets a token output cap of `256` tokens.
  - **Deep Think Mode (🧠)**: Designed for detailed reasoning. Generates detailed, structured, precise, and comprehensive answers, allows detailed bulleted lists, streams thinking/reasoning blocks dynamically into a collapsible UI panel, ends with a contextually smart follow-up question referencing an unasked aspect of the topic, and sets a token output cap of `1024` tokens.
  - **Error Handling (502 / 500)**: Note that if Deep Think Mode throws a 502 error, it is caused by the Go proxy receiving an HTTP 500 error from the Google Gemini API when using the default model `gemma-4-31b-it`. This can be resolved by deploying/configuring the `DEEP_MODEL` environment variable in the Hugging Face Space settings to a model matching the developer's API key permissions (e.g., `gemini-2.5-pro` or another authorized thinking model).

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
* **Image Compression**: **expo-image-manipulator** (`~13.0.5`) for client-side resizing and optimization
* **Local Storage:** `@react-native-async-storage/async-storage` for persisting login lockout/cooldown states.

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
│       └── mascot-transparent-sad.png # Sad transparent mascot for delete modal
├── proxy/
│   ├── Dockerfile                   # Multi-stage Docker config for HF Spaces
│   ├── README.md                    # Backend run & deployment instructions
│   ├── chat.go                      # SSE follow-up chat endpoint
│   ├── gemini.go                    # Shared Gemini API calling and stream handlers
│   ├── go.mod                       # Go 1.22 module definition
│   ├── scan.go                      # SSE unified classification & diagnosis endpoint (buffers first line)
│   └── main.go                      # Entry point, routing, and CORS middleware
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # Root Layout (Loads Fredoka font, wraps providers, Chrome DevTools network hook)
│   │   ├── index.tsx                # App entry redirect (routes to /splash)
│   │   ├── splash.tsx               # Staggered fade-in splash screen with transparent WebP animation
│   │   ├── login.tsx                # Redesigned login with mascot logo, lockout timer, & custom toast alerts
│   │   ├── register.tsx             # Redesigned registration screen with password strength progress bar
│   │   ├── forgot-password.tsx      # 3-step secure password recovery wizard (Email, 6-digit OTP, Strength-tested Reset)
│   │   ├── scan-results.tsx         # Bento Grid Detailed Diagnosis Dashboard with low-confidence warning banner
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
│   │   ├── ScanContext.tsx          # Scan provider (initializes SQLite db, handles low-confidence toast warning, runs compression)
│   │   └── ToastContext.tsx         # Global Custom Toast context provider (exposes toast view states & animations)
│   ├── services/
│   │   ├── auth.service.ts          # Supabase authentication service calls wrapper
│   │   ├── profile.service.ts       # Profiles database & avatars storage calls wrapper
│   │   ├── scan.service.ts          # SQLite-First operations, Supabase bucket uploads, and bidirectional sync
│   │   └── api.service.ts           # Go proxy API helper (classifyCrop, scanCrop SSE streaming)
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

1. **AI Proxy Re-deployment**: Deployed and fully operational on Hugging Face Spaces.
2. **EAS Development Build**: Configured in `eas.json` (development and preview profiles corrected to use the Hugging Face Proxy URL).
3. **Compilation Status**: Verified with `npx tsc --noEmit` which completes with **0 errors**.
4. **Dev Server Command**:
   ```bash
   npx expo start
   ```
5. **Platform Previews**:
   * **Mobile Device (Expo Dev Client)**: Build the development client using EAS, install the APK on the device, and connect to the Metro server.
   * **Hermes/Network Debugger**: Chrome DevTools (`chrome://inspect`) target `localhost:8081` connects to the running app. The `XMLHttpRequest` override allows inspection of network traffic in the Chrome DevTools network panel.
