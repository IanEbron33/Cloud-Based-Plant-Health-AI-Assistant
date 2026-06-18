# Session Context: Bugsok AI — Plant Health Tracker

This document captures the current state, architecture, and files of the project at the end of this session. It can be loaded in future chat sessions or by other AI agents to immediately resume development.

---

## 📅 Project Context (As of June 18, 2026)

* **App Title:** Bugsok AI
* **App Subtitle:** Plant Health Tracker
* **Operating Framework:** React Native Expo (Expo Router)
* **SDK Version:** **Expo SDK 54** (downgraded for compatibility with client's physical Expo Go device)
* **Platform Support:** iOS, Android, and Web
* **Primary Language:** Taglish/English UI
* **Design Guidelines:** Solid green shades (Mint, Emerald, Forest) with crisp elevations, smooth concentric curves, and borders. **No glassmorphism.**
* **Custom Floating Bottom Navigation Bar**:
  * **Floating capsule bar**: absolutely positioned white bar with rounded corners and shadow.
  * **Shared Sliding Capsule**: A single active background capsule (`width: 66, height: 56`) that smoothly slides horizontally to the active tab using spring physics (`Animated.spring` on `translateX`).
  * **Morphing Corners**: Capsule border radius morphs from `32` (on edge tabs: Home and Profile) to `18` (on middle tabs: History and Chat).
  * **Elevated Scan Button**: Circular button floating above the center of the bar. It spring-scales to `1.12` and displays a looping, breathing scanner glow ring (`pulseRing`, `scale: 1.0` -> `1.45`, fading `0.5` -> `0.0` over `1800ms`) when selected.
  * **Smooth Icon & Label Transitions**: Active tabs animate the icon to scale up (`1.0` -> `1.15`) and shift upwards (`translateY: 0` -> `-5`) using spring physics, while the label is always-mounted and slides and fades in (`translateY` `8` -> `0`, opacity `0` -> `1`). When focus is lost, they return to the center and fade out smoothly (no instant unmounting or layout popping).
  * **Driver Conflict Isolation**: Structured as nested views (`slidingPillContainer` + `slidingPillInner`) to isolate native GPU-driven animations (translate, opacity) from JS-driven animations (border-radius), preventing React Native driver conflicts.
* **Profile Header Background**: Premium linear gradient background (`['#047857', '#064e3b']`) applied using `expo-linear-gradient` to the header of the Profile screen.
* **Scan Results Health Gauge**: Circular progress indicator with a thicker bold `strokeWidth={10}` on the Scan Results screen to highlight the crop's health score.
* **Concentric Layout & Border-Radius Smoothing**:
  * **AI Toggle switch**: Outer container uses `rounded-[20px]` and inner sliding pill uses `borderRadius: 16` (20px outer - 4px padding = 16px inner) to deliver a perfectly aligned, smooth concentric curvature.
  * **Camera Viewport**: Replaced dashed border with solid `border-stone-300` and `rounded-[24px]` corners to prevent rendering artifacts or jagged aliasing.
  * **Hero Image Card**: Applied matching concentric border-radius layout (`rounded-[24px]` outer `BentoTile` and `rounded-[23px]` inner `View`/`Image`/overlay) to prevent corner pixel bleed.
* **Mascot Animation Custom Splash Screen**:
  * **Image Rendering**: Renders `assets/images/mascot-animation.webp` (transparent animated WebP converted from WebM via FFmpeg with alpha channel preservation) on a solid stone-50 background.
  * **Expo Image**: Uses `expo-image` for high-performance, hardware-accelerated rendering of the transparent animation in Expo Go.
  * **Staggered Entrance**: Animated title "Bugsok AI" fades in at `1.0s` and the subtitle fades in at `1.5s` using native-driven opacity transitions.
  * **Automated Flow**: The entire screen fades out at `3.5s` and redirects the user to the `/login` screen at `4.0s` (matching the 4-second mascot animation).

---

## 🛠️ Technology Stack & Dependencies

* **Core:** React 19.1.0, React Native 0.81.5
* **Navigation:** Expo Router (file-based stack & tabs under `src/app`)
* **Styling:** **NativeWind v4** (Tailwind CSS for React Native) compiled with `react-native-reanimated` plugin
* **Typography:** **Fredoka** Google Font family (loaded asynchronously using `expo-font`)
* **Icons:** **Lucide Icons** (`lucide-react-native`) and **Ionicons** (`@expo/vector-icons`)
* **Media Rendering:** **expo-image** (for rendering transparent animated WebP on splash screen)
* **Assets:** Custom mascot logo (`assets/images/mascot-logo.jpeg`) and bundled plant disease database (`assets/data/vegetables_db.json`)

---

## 📂 Core Directory Structure

Key files and directories in the repository:
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
│   │   ├── _layout.tsx              # Root Layout (Loads Fredoka font, Metro config injection)
│   │   ├── index.tsx                # App entry redirect (routes to /splash)
│   │   ├── splash.tsx               # [NEW] Custom staggered fade-in splash screen with transparent WebP animation
│   │   ├── login.tsx                # Redesigned English-only login with mascot logo & Lucide icons
│   │   ├── register.tsx             # Redesigned English-only registration screen
│   │   ├── scan-results.tsx         # Bento Grid Detailed Diagnosis Dashboard with circular health progress and spring enter animations
│   │   ├── chat.tsx                 # Detailed crop follow-up chat conversation screen with model selector (Flash vs Deep)
│   │   └── (tabs)/
│   │       ├── _layout.tsx          # Custom Tab bar layout (integrates CustomTabBar)
│   │       ├── index.tsx            # Home Dashboard (Quick stats, recent scans list, tips)
│   │       ├── history.tsx          # Past scans (search bar, offline sync badges)
│   │       ├── scan.tsx             # Camera preview guidelines frame with solid rounded-[24px] border, custom sliding AI mode toggle (Zap/Brain) with concentric border-radius layout, and action buttons
│   │       ├── chat.tsx             # General Chat tab placeholder screen (Coming Soon)
│   │       └── profile.tsx          # User profile info, SQLite synchronization dashboard, and LinearGradient header
│   ├── components/
│   │   ├── BentoGrid.tsx            # Bento layout tiles (colSpan helper wrapper)
│   │   ├── CircularProgress.tsx     # SVG progress circle matching health severity
│   │   └── CustomTabBar.tsx         # [NEW] Shared sliding pill floating bottom tab bar with pulse rings
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

1. **Compilation Status:** Checked via `npx tsc --noEmit`. Passes successfully with **0 errors and 0 warnings**.
2. **Local Metro Bundler:** Runs cleanly without errors.
3. **Core Development Command:**
   ```bash
   npx expo start -c
   ```
   *(Always use `-c` when resetting or installing new assets to wipe Metro's internal caches).*
4. **Platform Previews:**
   - **Mobile (Phone):** Scan the QR code shown by `npx expo start` inside the **Expo Go** app (compatible with SDK 54).
   - **Web Browser:** Press **`w`** in the Expo terminal window to launch in Chrome/Edge at `http://localhost:8081`.

---

## ⏭️ Next Phase: Phase 2 — Go Proxy Backend

Once the frontend layout is finalized and you're ready to proceed to Phase 2:
1. Create a `backend/` directory in the root.
2. Scaffolding Go proxy server (`go mod init`, installing Google Generative AI Go SDK).
3. Wire the classification endpoint (Gemini Flash Lite router) and diagnosis endpoint (streamed relay using SSE).
4. Dockerize and configure for Google Cloud Run deployment.
