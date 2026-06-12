# Project Architecture: Mines & Choo Choos

This document outlines the project structure and the design philosophy for the game.

## 1. High-Level Architecture

The application is built on a modular, reactive architecture using Svelte 5 (Runes).

* **Data Layer (`src/types.ts` & `src/stores/`):** The "Source of Truth." Defines the shape of data and handles reactive state using `$state` and `$derived`.
* **Logic Layer (`src/logic/`):** The "Brain." Pure TypeScript functions for game mechanics (e.g., world generation, simulation). These are decoupled from the UI.
<!-- * **Orchestrator (`TabContent.svelte`):** The "Router." Watches the active tab state and dynamically mounts the corresponding View. -->
* **View Layer (`src/views/*.svelte`):** The "Content." Focused, self-contained screens representing the 5 major game tabs.
* **Layout Layer (`App.svelte`):** The "Shell." The main container structure containing the Header, Footer, and the Orchestrator.

## 2. Orchestration & Navigation Flow

The Orchestrator is the heartbeat of the app. Rather than using a complex library-based router, we use a custom reactive controller:

1. **State Initiation:** The `uiStore` holds the `activeTab` rune.
<!-- 2. **The Orchestrator:** `TabContent.svelte` acts as a dynamic component switch. It uses a Svelte 5 snippet or a keyed reactive block to swap views when the `activeTab` changes. -->
3. **Encapsulation:** Because each `View` (e.g., `MineView`) owns its specific lifecycle, switching tabs effectively "pauses" or "unmounts" the previous logic slice, ensuring high performance.
<!-- 4. **Logging Hook:** The Orchestrator wraps every tab-switch event with a `log.info` call, providing a clean audit trail in the console whenever the player navigates the interface. -->

## 3. File Structure Map

```text
/public/         # Static assets (favicon, manifest, robots.txt)
/src/
├── assets/      # Processed images, icons (optimized by Vite)
├── components/  # Reusable UI bits (Buttons, Inputs, Cards)
├── views/       # Full-page content (WorldView, MineView, etc.)
├── stores/      # Reactive application state (gameStore.ts, uiStore.ts)
├── logic/       # Pure TS game rules (worldGen.ts, mineGen.ts)
├── lib/         # Generic utilities (formatNumber.ts, logger.ts)
├── styles/      # Global CSS (reset.css, responsive.css)
├── types.ts     # Central data structures (Interfaces, Enums)
└── app.svelte   # Main shell

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

---

### Changes and Justifications:

* **Orchestration Section:** Added specific details on how the Orchestrator works (the "dynamic switch" concept) to make it feel less "boring" and more functional.
* **Logging Integration:** Explicitly linked the logging strategy (defined in section 5) to the `lib/` folder structure, ensuring your console preference is built into the architecture.
* **Architecture Sync:** Integrated the "Logic vs. Lib" decision test directly into the structure to ensure the `logic/` folder doesn't get cluttered with general-purpose code.