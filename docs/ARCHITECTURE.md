# Project Architecture: Mines & Choo Choos

This document outlines the project structure and the design philosophy for the game.

## 1. High-Level Architecture

The application is built on a modular, reactive architecture using Svelte 5 (Runes).

* **Data Layer (`src/types.ts` & `src/stores/`):** The "Source of Truth." Defines the shape of data and handles reactive state using `$state` and `$derived`.
* **Logic Layer (`src/logic/`):** The "Brain." Pure TypeScript functions for game mechanics (e.g., world generation, simulation). These are decoupled from the UI.
<!-- * **Orchestrator (`TabContent.svelte`):** The "Router." Watches the active tab state and dynamically mounts the corresponding View. -->
* **View Layer (`src/views/*.svelte`):** The "Content." Focused, self-contained screens representing the 5 major game tabs.
* **Layout Layer (`App.svelte`):** The "Shell." The main container structure containing the Header, Footer, and the Orchestrator.

## 2. Navigation & View Loading

Navigation is handled through a reactive `activeTab` state in `navigation` store.

1. **Dynamic Switching:** `App.svelte` conditionally renders the view matching the `navigation.activeTab` state.
2. **Encapsulation:** Because each `View` (e.g., `SettingsView`) owns its specific lifecycle, switching tabs effectively manages the mount/unmount state, ensuring high performance.

## 3. File Structure Map

```text
/public/        # Static assets (favicon, manifest, robots.txt)
/src/
├── assets/     # Processed images, icons (optimized by Vite)
├── components/ # Reusable UI bits (Buttons, Tooltips)
├── views/      # Full-page tab content (WorldView, SettingsView, etc.)
├── stores/     # Reactive application state (index.svelte.ts)
├── logic/      # Pure TS game rules (save.svelte.ts, worldGen.ts)
├── lib/        # Generic utilities (logger.ts)
├── styles/     # Global CSS (theme.css)
├── types.ts    # Central data structures (Interfaces, Enums)
└── App.svelte  # Main shell
```

## 4. Folder Breakdown & Decision Matrix

| Folder | Responsibility | Example |
| --- | --- | --- |
| `/public` | Static files for the browser/OS | `favicon.ico`, `manifest.json` |
| `/src/assets` | Game content needing optimization | `sprite.png`, `background.webp` |
| `/src/components` | Reusable UI building blocks | `Button.svelte`, `Navbar.svelte` |
| `/src/views` | Top-level tab content | `WorldView.svelte`, `StationView.svelte` |
| `/src/stores` | Reactive application state | `gameStore.ts`, `uiStore.ts` |
| `/src/logic` | Game-specific mechanics | `worldGen.ts`, `calcTravel.ts` |
| `/src/lib` | Generic helper code | `math.ts`, `logger.ts` |
| `/src/styles` | Global application-wide CSS | `reset.css`, `material3.css` |

## 5. CSS & Logging Strategy

* **CSS:** Use **Global CSS (`src/styles/`)** for design tokens and resets, and **Component CSS** for encapsulated, logic-based styling (e.g., `class:locked={...}`).
* **Logging:** All game-specific logic must use the `lib/logger.ts` wrapper.
* Use `log.debug` for transient state changes (e.g., miner merging).
* Use `log.info` for lifecycle and navigation events.
* Use `log.error` for failed state loads or gen-logic crashes.



## 6. Decision Test (Logic vs. Lib)

> **"If I were building a completely different game, would this code still be useful?"**

* **YES:** It is a utility → **`src/lib/`**
* **NO:** It is game-specific business logic → **`src/logic/`**
