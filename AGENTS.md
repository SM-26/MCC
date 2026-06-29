You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

---

// THIS NEXT PART OF THE FILE IS NOT UP TO DATE! USE WITH CAUTION!
# MCC V2 - Mines & Choo-Choos v2

A mobile-first idle railway tycoon game built with Svelte 5 and Bits-UI.

## Project Status: 🚧 In Development

### Current Phase: Foundation + Settings Tab Complete

#### ✅ Completed Components
- **Settings Tab** (`src/views/SettingsView.svelte`)
  - Theme selection (dark/light/system/user)
  - Navbar position toggle (top/bottom)
  - Dev mode, sound, notifications toggles
  - Global save and reset management
  
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
│   │   └── GameTooltip.svelte       # ✅ Tooltip UI
│   ├── logic/
│   │   └── save.svelte.ts           # ✅ Persistence logic
│   ├── sizes.ts                     # ✅ Breakpoint constants
│   └── theme.ts                     # ✅ Theme tokens
├── stores/
│   └── index.svelte.ts              # ✅ Svelte 5 state stores
├── views/
│   └── SettingsView.svelte          # ✅ Settings Implementation
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
5. **PWA Install Prompt** - Manifest setup
6. **Dev Tools** - Debug panel integration

---

## Architecture Notes

### State Management
- Uses Svelte stores for reactive state
- Centralized types in `src/types.ts`
- Settings persisted via store updates

### Responsive Design
- Mobile-first approach
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

Open `http://localhost:8080` to view the app.

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

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues (via `gh` CLI); external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses `needs-triage`, `needs-info`, `ready-for-agent` (new labels to be created), `help wanted` (existing), and `wontfix` (existing). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo; domain docs live under `docs/` (`/CONTEXT.md`, `docs/adr/`). See `docs/agents/domain.md`.
