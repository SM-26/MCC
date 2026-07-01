---
**Cheat menu brief for developers:**
---

## Task: Developer Cheat Menu

**Context:** MCC (Mines & Choo-Choos) is a Svelte 5 + TypeScript idle game. Testing progression features requires specific game states that are slow to reach through normal play (e.g., a second built plot requires world exploration via trains, which aren't yet implemented). We need a dev-only cheat panel to set up test scenarios instantly.

**Gating:** Only visible when `gameState.current.settings.devMode === true`. That toggle already exists in Settings.

**Where to add it:** A collapsible panel in `SettingsView.svelte`, inside a `{#if devMode}` block. Use the existing `SettingsSection` accordion component. No new files needed.

**Cheats to implement:**

1. **Add money** — button that adds 1,000 to `gameState.current.money`
2. **Reveal all world cells** — loop `worldStore.current.cells`, set every `cell.discovered = true`
3. **Build active plot** — call `ensurePlotScaffold(activePlotCellId)` if not already built (check `plotsStore.get(activePlotCellId)`)
4. **Discover + scaffold a neighbor plot** — find the first undiscovered cell of type `'plot'` in `worldStore.current.cells`, set `discovered: true`, call `ensurePlotScaffold` on it


**Key imports the developer will need:**
- `gameState` from `src/logic/app/gameState.svelte`
- `worldStore` from `src/logic/world/worldStore.svelte`
- `plotsStore` from `src/logic/mine/plotsStore.svelte`
- `ensurePlotScaffold` from `src/logic/mine/mineActions.ts`
- `debouncedSave` from `src/logic/save/save.svelte`

**Architecture rules to follow:**
- No new stores. Mutate existing state directly.
- Call `debouncedSave()` after any mutation.
- All buttons should use `Button.Root` from `bits-ui` with `class="glass-btn"` for styling consistency.
- Log actions with `log.debug('cheat', 'message')` — never `console.*`.

**State management pattern in this codebase:**
```ts
// Mutate reactive state directly — no dispatch, no actions needed for simple cases
gameState.current.money += 1000;
debouncedSave();
```

---