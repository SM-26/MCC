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

# MCC — Mines & Choo-Choos

A mobile-first, portrait-first idle railway tycoon built with Svelte 5 (runes) and bits-ui.

**Architecture, conventions and commands live in `CLAUDE.md`. Domain vocabulary lives in `CONTEXT.md`.** This file covers only project status and agent-facing tooling — don't duplicate the other two here.

## Project status

Five tabs are routed in `src/App.svelte`; four have real views in `src/views/`.

| Tab | State |
|---|---|
| World | Built — hex map, fog of war, pan/zoom, train-driven exploration |
| Mine | Built — tile clearing, miner drag-to-merge, dig deeper, multiple mineshafts, age advancement |
| Station | Built — platforms, train yard, engines/carts, routes, dispatch. A redesign is planned (`docs/FOLLOW-UPS.md`) |
| Settings | Built — theme, navbar position, dev toggles, save management, dev cheat panel |
| Engineering | **Placeholder only** — an inline block in `App.svelte`, no view file. `EngineeringState` (`engineeringIdeas`, `maxNorthExpansions`, `maxUndergroundLevels`) exists and is persisted, but nothing in the UI can spend ideas or raise a cap |

Consequences of that last row worth knowing before planning work: `maxNorthExpansions` defaults to 1, so a plot is limited to two mineshafts and no in-game action can change that. `maxUndergroundLevels` is unused entirely — the dig-depth ceiling comes from the plot's age (`getMaxDepthForAge`), not from engineering.

Remaining work is tracked in `docs/FOLLOW-UPS.md` (deferred items, live bugs, provisional balance) and GitHub Issues (anything with an owner or a save-format impact) — not here.

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues (via `gh` CLI); external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses `needs-triage`, `needs-info`, `ready-for-agent` (new labels to be created), `help wanted` (existing), and `wontfix` (existing). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo; domain docs live under `docs/` (`/CONTEXT.md`, `docs/adr/`). See `docs/agents/domain.md`.
