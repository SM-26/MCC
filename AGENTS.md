# MCC V2 - Merge & Choo-Choo v2

A mobile-first idle railway tycoon game built with Svelte 5 and Bits-UI.

## Project Status: 🚧 In Development

### Current Phase: Foundation + Settings Tab Complete

#### ✅ Completed Components
- **Settings Tab** (`src/lib/components/Settings.svelte`)
  - Theme selection (dark/light/system/user)
  - Navbar position toggle (top/bottom)
  - Dev mode, sound, notifications toggles
  - Circular navigation controls
  
- **App Shell** (`src/App.svelte`)
  - Responsive layout with adaptive navbar
  - Splash screen with loading state
  - Tab navigation infrastructure
  - Screen size detection (xs/xl breakpoints)

#### 📁 Project Structure
```
src/
├── lib/
│   ├── components/
│   │   └── Settings.svelte          # ✅ Complete
│   ├── sizes.ts                     # ✅ Breakpoint constants
│   └── theme.ts                     # ✅ Theme tokens
├── stores/
│   └── index.ts                     # ✅ State stores
├── types.ts                         # ✅ TypeScript types
├── App.svelte                       # ✅ Main shell
└── styles/
    └── theme.css                    # ✅ CSS variables
```

---

## Development Order (Next Phases)

### Phase 2: Core Tabs (in order)
1. **Mine Tab** - Grid view, miner drag-drop, age progression
2. **Station Tab** - Train yard, platform management  
3. **World Tab** - Hex map, fog of war, destinations
4. **Engineering Ideas** - Tech tree UI

### Phase 3: Polish
5. **Settings Integration** - Persist settings to localStorage
6. **PWA Install Prompt** - Manifest setup
7. **Dev Tools** - Debug panel integration

---

## Architecture Notes

### State Management
- Uses Svelte stores for reactive state
- Centralized types in `src/types.ts`
- Settings persisted via store updates

### Responsive Design
- Mobile-first approach (default: bottom nav)
- Breakpoints defined in `src/lib/sizes.ts`
- Adaptive navbar position based on screen size

### Theme System
- CSS variables for easy theming
- Supports 4 theme modes (dark/light/system/user)
- Smooth transitions between themes

---

## Quick Start

```bash
pnpm dev
```

Open `http://localhost:5173` to view the app.

---

## Tech Stack

- **Svelte 5** - Reactive framework with runes
- **Bits-UI** - Headless UI primitives
- **Vite** - Build tool & dev server
- **TypeScript** - Type safety

---

## Notes for Developers

- All measurements use centralized constants from `src/lib/sizes.ts`
- Theme colors defined in `src/styles/theme.css`
- Settings state lives in `src/stores/index.ts`
- Use `appContext.screenSize` for responsive logic
