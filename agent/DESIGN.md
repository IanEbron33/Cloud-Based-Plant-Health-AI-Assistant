# Bugsok AI — App Design Guide

This document captures the official design guidelines, visual identity, theme specifications, typography, and layout rules for the **Bugsok AI — Plant Health Tracker** mobile application. Developers and designers should follow this system to maintain aesthetic consistency across all platforms (iOS, Android, and Web).

---

## 🎨 Core Design Philosophy

Bugsok AI utilizes a clean, modern, and high-fidelity mobile interface designed to look premium and feel extremely responsive.

*   **Primary Palette:** Solid green shades representing nature, growth, and agricultural health (Mint, Emerald, Forest).
*   **Structure:** Concentric rounded boundaries, crisp shadows/elevations, and thin borders.
*   **Transparency Policy:** **No glassmorphism.** Translucent elements are restricted to specific styling effects (e.g., selection backdrops or modal dimmers).
*   **Tone:** Friendly, encouraging, educational, and strictly focused on agriculture/gardening.

---

## 🌈 Colors & Theme

The application is designed strictly with a clean, high-contrast **Light Mode** theme. Dynamic dark mode is not supported. Colors are defined in two main locations: `src/constants/theme.ts` for the React Native styling layer and `tailwind.config.js` for the NativeWind CSS utilities.

### 1. Global Theme Colors (`src/constants/theme.ts`)

| Variable | Value | Description |
| :--- | :--- | :--- |
| `text` | `#000000` | Primary text content |
| `background` | `#ffffff` | Main screen backdrop |
| `backgroundElement` | `#F0F0F3` | Cards, list items, and buttons |
| `backgroundSelected` | `#E0E1E6` | Active list selection or highlight states |
| `textSecondary` | `#60646C` | Subtitles, labels, and secondary context |

### 2. Custom Tailwind Palette (`tailwind.config.js`)

#### A. Crop Green Theme (`crop-*`)
A custom green scale utilized for primary buttons, active UI states, and agricultural elements:
*   `crop-50`: `#f2f8f4` (Lightest mint backdrop)
*   `crop-100`: `#e1efe5`
*   `crop-200`: `#c5dfcd`
*   `crop-300`: `#9bc8a8`
*   `crop-400`: `#6ca97d`
*   **`crop-500`**: `#478b59` *(Primary brand green)*
*   `crop-600`: `#357045`
*   `crop-700`: `#2c5938`
*   `crop-800`: `#25472f`
*   `crop-900`: `#1f3c29`
*   `crop-950`: `#0e1f14` *(Dark forest green)*

#### B. Severity Indicators (`severity-*`)
Used on scan result gauges, warning cards, and progress metrics:
*   **`none` (Healthy):** `#10b981` (Emerald/Green)
*   **`low`:** `#f59e0b` (Amber/Yellow)
*   **`moderate`:** `#f97316` (Orange)
*   **`high`:** `#ef4444` (Red)

### 3. Special Color Rules & Layout Accents
*   **Profile Screen Header:** Linear gradient background using `['#047857', '#064e3b']` (transits from Emerald-700 to Forest Green-900).
*   **Delete Confirmation Modal Backdrop:** `bg-black/60` (semi-transparent overlay).
*   **Toast Alert Systems:** 
    *   *Success:* Emerald (`#10b981`)
    *   *Warning:* Amber (`#f59e0b`)
    *   *Error:* Red (`#ef4444`)
*   **Text Formatting Parser:**
    *   `**bold text**` inside chat markdown: Rendered in **bold emerald green**.
    *   `*italic accent*` (e.g., culinary recipes like *Tinola*, *Sinigang*): Rendered in **bold-italic soft mint green**.

---

## 🔤 Typography & Font Style

The application relies on the Google Font **Fredoka** loaded asynchronously.

*   **Regular Font Weight:** `Fredoka_400Regular` (for paragraph text, input labels, description lists).
*   **Bold Font Weight:** `Fredoka_700Bold` (for headings, title headers, button labels).

### 1. FredokaText Wrapper (`src/components/themed-text.tsx`)
Rather than manually declaring font families, the app uses a custom wrapper [FredokaText](file:///c:/Users/ADMIN/Desktop/Folder1/Cloud-Based%20Plant%20Health%20AI%20Assistant%20-%20Mobile%20Application/src/components/themed-text.tsx) which automatically intercepts and maps weights:
*   Any text containing `fontWeight: 'bold'`, `700`, `800`, `900`, `600` (semibold), or Tailwind classes like `font-bold`, `font-semibold`, `font-extrabold`, or `font-black` automatically maps to the **`Fredoka_700Bold`** font family.
*   All other styles default to **`Fredoka_400Regular`**.

### 2. Predefined Type Weights & Sizes (`ThemedText`)
*   `title`: `fontSize: 48`, `lineHeight: 52`, `fontWeight: 600`
*   `subtitle`: `fontSize: 32`, `lineHeight: 44`, `fontWeight: 600`
*   `default`: `fontSize: 16`, `lineHeight: 24`, `fontWeight: 500`
*   `small`: `fontSize: 14`, `lineHeight: 20`, `fontWeight: 500`
*   `smallBold`: `fontSize: 14`, `lineHeight: 20`, `fontWeight: 700`
*   `link` / `linkPrimary`: `fontSize: 14`, `lineHeight: 30` (Primary Link: `#3c87f7`)
*   `code`: `fontFamily: monospace`, `fontSize: 12`

---

## 🪱 Mascot: Bugsok / Bugsok AI

The application features **Bugsok**, a friendly agricultural plant health helper. Bugsok communicates with users, reacts to scan results, and guides them through treatment.

### 1. Visual Assets (`assets/images/`)
*   **Splash Screen Animation:** `mascot-animation.webp` (A transparent, borderless animated WebP logo, shown for 4.0s).
*   **App Logo / Icon:** `mascot-logo.png` (High-quality 512x512 PNG, configured in `app.json` for Launcher and App Store scale safety).
*   **Standard Chat Avatar:** `mascot-transparent.png` (Used as the circular avatar preceding chatbot replies).
*   **Sad Mascot:** `mascot-transparent-sad.png` (Featured in the custom delete confirmation modal, scaled to 130x130).
*   **State-Dependent Avatars:** Shown on the Home screen based on the highest diagnosed severity:
    *   `mascot-happy.png`: Highest scan severity is "None" / All plants are healthy.
    *   `mascot-concerned.png`: Highest scan severity is "Moderate" or "Low".
    *   `mascot-worried.png`: Highest scan severity is "High" / Severe crop condition.

### 2. State-Dependent Mascot Speech Bubbles
The home screen greeting bubble text updates dynamically:
*   **Healthy State:** e.g., *"All clear! Your crops are in top shape. Bugsok is happy to see them grow!"*
*   **Warning State:** e.g., *"We spotted some leaf issues. Let's make sure they get the right organic treatment."*
*   **Critical State:** e.g., *"Oh no! We have critical plant infections. Let's look at the treatment options immediately!"*

---

## 📐 Layouts & Core UI Components

### 1. Custom Floating Bottom Navigation Bar (`CustomTabBar.tsx`)
A capsule bar positioned at the bottom of the screen with a premium sliding transition:
*   **Outer Capsule:** `height: 70`, `borderRadius: 35`, background color `#ffffff`.
*   **Positioning:** Absolute container with `bottom: 24`, `left: 16`, `right: 16`. Shadow configured with offset `{ width: 0, height: 8 }`, opacity `0.1`, radius `12`, and elevation `8`.
*   **Sliding Pill Indicator:** A translucent emerald background (`rgba(5, 150, 105, 0.08)`) capsule sizing `width: 66, height: 56` that shifts dynamically using native `Animated.spring`.
*   **Morphing Corner Radii:**
    *   Edge tabs (Home, Profile): `borderRadius: 32` (smooth oval edges).
    *   Middle tabs (History, Chat): `borderRadius: 18` (squarish concentric edges).
*   **Raised Scan Button:** A circular `56x56` button with `borderRadius: 28` and background `#059669`. It sits elevated (`marginTop: -32`) above the tab bar.
    *   *Scan Transition:* Scales by `1.12` when selected.
    *   *Breathing Radial Ring:* A `pulseRing` overlay (border `2.5px`, border color `#059669`, background `rgba(5, 150, 105, 0.15)`) that pulses from scale `1.0` to `1.45` and fades from opacity `0.5` to `0.0` over `1800ms`.

### 2. Bento Grid System (`BentoGrid.tsx`)
Organizes information in a tiled dashboard (Bento Grid):
*   **Grid layout:** `flex-row flex-wrap justify-between w-full`.
*   **Bento Tiles (`BentoTile`):**
    *   *Outer container:* `rounded-[24px]` border-radius, background `bg-white`, border `border-stone-200`, and `shadow-sm`.
    *   *Spacing:* Padding `p-4`, margins `mb-3`.
    *   *Sizing:* Half-width (`w-[48.5%]`) for grids or Full-width (`w-full`) for broad blocks.
    *   *Transitions:* Animates using staggered vertical entrances (`FadeInDown` from Reanimated) with a duration of `400ms` and `390ms * index` delays.
    *   *Header Titles:* `text-[11px] uppercase tracking-wider text-stone-900` styled in `Fredoka_700Bold`.

### 3. Circular Progress Gauge (`CircularProgress.tsx`)
Renders the crop health progress score on the Scan Results screen:
*   **SVG Structure:** Concentric dual circle system.
*   **Background circle track:** Solid `#f5f5f4` (stone-100).
*   **Foreground indicator:** Progress arc colored according to severity (`color`), utilizing a thick `strokeWidth={8}` (or `strokeWidth={10}`) and `strokeLinecap="round"` to eliminate jagged ends.
*   **Percentage Display:** Numeric percentage text styled with `font-extrabold text-stone-900` positioned absolutely at the center.

### 4. Concentric Border-Radius Rules
To ensure consistent geometric harmony (no corner pixel bleed), outer/inner layouts maintain a ratio relationship:
*   **AI Toggle Switch:** Outer switch track container is `rounded-[20px]`, inner active sliding pill is `borderRadius: 16`.
*   **Camera Viewport:** Container solid border `border-stone-300` with `rounded-[24px]`.
*   **Hero Image Card:** Outer `BentoTile` uses `rounded-[24px]`, inner `Image` and shadow-overlays use `rounded-[23px]` (exactly 1px smaller to align perfectly inside).
*   **Forms & Input Boxes:** Outer containers (e.g. Login, Forgot Password card) use `rounded-[32px]`, inner text-inputs use `rounded-2xl` (`16px`).

### 5. Chat & Assistant Interface Design
*   **Auto-Growing Input:** Dynamic height text field (`minHeight: 38`, `maxHeight: 120`) inside a `rounded-[22px]` border box. Send action button aligns to `items-end` to sit at the bottom-right as height expands.
*   **Delete Modal Overlay:** Backdrop dims screen at `bg-black/60` with center modal card zooming from scale `0.9` to `1.0` via ease-out quadratic curves (`Easing.out(Easing.quad)`).
*   **Typing/Thinking Animators:**
    *   *Flash Mode (⚡):* Shows `"Bugsok is typing..."`.
    *   *Deep Think Mode (🧠):* Rotates text categories every 2.5s (e.g. *"Bugsok is analyzing the crop symptoms..."*, *"Bugsok is in deep thinking..."*, *"Bugsok is formulating treatment options..."*) to represent reasoning latency. Collapsible panel `collapsible.tsx` wraps the styled thinking process blocks.
