# TypeScript-Migration: Quick Start Guide

## Overview
This guide provides a quick start for the `fresh-start-miner-loop` branch. It explains how to run the application, understand the current architecture, and where to find implementation details.

## Current State
The application is currently in a **Modular Monolith** state. The core mining system is fully functional, serving as a proof-of-concept for the game loop. The World and Station systems are placeholders awaiting implementation.

-   **✅ Mines:** Fully implemented (mining, merging, depth progression).
-   **✅ Save:** Fully implemented (localStorage persistence).
-   **⚠️ World:** Placeholder (needs seeded map generation).
-   **⚠️ Station:** Placeholder (needs train/logistics logic).

## Quick Start

### 1. Run the Application
The application does not require a build step for development. You can run it directly using a Python HTTP server:

```bash
cd /mnt/c/users/or_ga/Documents/MCC
pip install serve
serve -s public -l 8000
# Open http://localhost:8000 in your browser
```

### 2. Verify Functionality
Once the server is running, open `http://localhost:8000` and verify:
-   ✅ The splash screen appears briefly, then transitions to the app.
-   ✅ The Mines tab is active by default (since it's the only complete system).
-   ✅ You can buy miners, mine rubble, and see money increase.
-   ✅ The "Dig Deeper" button becomes available once a plot is cleared.
-   ✅ The "Buy North" button appears to unlock new plots.
-   ✅ Save/Load works (reload the page, money persists).

### 3. Understand the Architecture
The application follows the **Modular Monolith** pattern defined in `technical_architecture_doc.md`.
-   **Single Source of Truth:** All state is in `src/types/game.ts` (`AppState`).
-   **Slice Pattern:** Logic is divided into slices (`mines`, `world`, `station`, etc.) that initialize in `src/app.ts`.
-   **No Iframes:** Slices are imported directly, not loaded via iframes (unlike the historical `Alpha1` docs).

## Documentation Map

### High-Level Design
-   **[train-idle-design-draft.md](../train-idle-design-draft.md)** - The foundational design document defining the game loop, terminology (World, City, Plot, Station, Route), and core pillars. **Read this first to understand the product vision.**

### Current Implementation Status
-   **[INDEX.md](./INDEX.md)** - Overview of the current branch's progress, linking to specific implementation docs.
-   **[CURRENT_STATE.md](./CURRENT_STATE.md)** - Detailed status report of implemented vs. pending systems (Mines vs. World/Station).

### Technical Architecture
-   **[technical_architecture_doc.md](../technical_architecture_doc.md)** - System-level entry point for developers. Explains how the codebase is shaped, slice boundaries, and dependency rules.

### Build & Deployment
-   **[BUILD_INSTRUCTIONS.md](../BUILD_INSTRUCTIONS.md)** - Instructions for running the app locally and deploying to production.

## Next Steps for Development

1.  **Implement World Generation:** Flesh out `src/world.ts` to generate a seeded map and handle discovery logic.
2.  **Implement Station Logic:** Flesh out `src/station.ts` to handle trains, carts, and routes.
3.  **Connect Tabs:** Ensure the UI tabs in `src/ui.ts` correctly switch between the Mines (active) and the new World/Station views once implemented.

## Summary

**Status:** ✅ Core Mining & Save Systems Complete, ⚠️ World & Station Systems Pending.

**Ready for:**
-   Implementation of World and Station systems to complete "Alpha 1" goals.
-   Feature expansion (e.g., resource types, prestige mechanics).

🎯 **Current branch is stable and extensible!**
