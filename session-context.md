# Session Context: Bugsok AI — Plant Health Tracker

This document captures the current state, architecture, and files of the project at the end of this session. It can be loaded in future chat sessions or by other AI agents to immediately resume development.

---

## 📅 Project Context (As of June 13, 2026)

* **App Title:** Bugsok AI
* **App Subtitle:** Plant Health Tracker
* **Operating Framework:** React Native Expo (Expo Router)
* **SDK Version:** **Expo SDK 54** (downgraded for compatibility with client's physical Expo Go device)
* **Platform Support:** iOS, Android, and Web
* **Primary Language:** Taglish/English UI
* **Design Guidelines:** Solid green shades (Mint, Emerald, Forest) with crisp elevations and borders. **No glassmorphism.**
* **Custom Floating Bottom Navigation Bar**:
  * **Floating capsule bar**: absolutely positioned white bar with rounded corners and shadow.
  * **Shared Sliding Capsule**: A single active background capsule (`width: 66, height: 56`) that smoothly slides horizontally to the active tab using spring physics (`Animated.spring` on `translateX`).
  * **Morphing Corners**: Capsule border radius morphs from `32` (on edge tabs: Home and Profile) to `18` (on middle tabs: History and Chat).
  * **Elevated Scan Button**: Circular button floating above the center of the bar. It spring-scales to `1.12` and displays a looping, breathing scanner glow ring (`pulseRing`, `scale: 1.0` -> `1.45`, fading `0.5` -> `0.0` over `1800ms`) when selected.
  * **Driver Conflict Isolation**: Structured as nested views (`slidingPillContainer` + `slidingPillInner`) to isolate native GPU-driven animations (translate, opacity) from JS-driven animations (border-radius), preventing React Native driver conflicts.

---

## 🛠️ Technology Stack & Dependencies

* **Core:** React 19.1.0, React Native 0.81.5
* **Navigation:** Expo Router (file-based stack & tabs under `src/app`)
* **Styling:** **NativeWind v4** (Tailwind CSS for React Native) compiled with `react-native-reanimated` plugin
* **Typography:** **Fredoka** Google Font family (loaded asynchronously using `expo-font`)
* **Icons:** **Lucide Icons** (`lucide-react-native`) and **Ionicons** (`@expo/vector-icons`)
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
│       └── mascot-logo.jpeg         # App mascot image (square with 12px rounded radius)
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # Root Layout (Loads Fredoka font, Metro config injection)
│   │   ├── index.tsx                # App entry redirect (routes to /login)
│   │   ├── login.tsx                # Redesigned English-only login with mascot logo & Lucide icons
│   │   ├── register.tsx             # Redesigned English-only registration screen
│   │   ├── scan-results.tsx         # Bento Grid Detailed Diagnosis Dashboard
│   │   └── (tabs)/
│   │       ├── _layout.tsx          # Custom Tab bar layout (integrates CustomTabBar)
│   │       ├── index.tsx            # Home Dashboard (Quick stats, recent scans list, tips)
│   │       ├── history.tsx          # Past scans (search bar, offline sync badges)
│   │       ├── scan.tsx             # Camera guidelines frame, ⚡ Flash vs 🧠 Deep Thinking toggles
│   │       ├── chat.tsx             # [NEW] Chat placeholder screen (coming soon)
│   │       └── profile.tsx          # User profile info and SQLite synchronization dashboard
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
