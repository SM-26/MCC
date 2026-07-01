# Design System — Mines & Choo-Choos

Visual direction: restrained **Frutiger-Aero** — frosted-glass panels, subtle gloss, chunky 3D
primary button — on a dark navy ground. A single theme colour drives the entire neutral palette.
Station and Engineering are intentionally **out of scope** and will get their own design passes.

---

## The one-colour principle

A single CSS variable **`--mcc-u`** (the "theme colour", default `#14213d` — brand navy) drives
the whole neutral ground — background, panels, borders, text, muted — through `color-mix()`.
Change that one value and the entire UI repaints.

- **Gold** (`--mcc-gold`) is the fixed **app accent**: active nav-tab, shaft number, selected
  world-cell ring, cost values. Never changes with the theme colour.
- **Clear-status colours** (none/soft/hard) are fixed and independent of `--mcc-u`.
- Mode is set by `body[data-theme='dark'|'light'|'system'|'user']`. Derived tokens are declared on
  the same element that sets `--mcc-u` (`:root` for dark, `body[data-theme='user']` for user,
  `body[data-theme='light']` for light). This matters because custom properties inherit their
  *substituted* value — a descendant override of `--mcc-u` would NOT recompute tokens declared on
  `:root`. Keep that structure.

> **`color-mix()` gotcha:** all two-colour mixes must sum to 100%.
> `color-mix(in srgb, var(--mcc-u) 86%, white 14%)` ✓
> `color-mix(in srgb, var(--mcc-u) 86%, white 6%)` ✗ — result goes partly transparent.

---

## Token reference

All tokens live in `src/styles/theme.css`. Applied via `src/lib/applyTheme.ts`.

### Colour

| Token | Dark value | Light value | Notes |
|---|---|---|---|
| `--mcc-u` | `#14213d` | `#14213d` | Theme colour — overridden by user mode |
| `--mcc-gold` | `#e8b24c` | `#bf8624` | Fixed app accent |
| `--mcc-bg-primary` | `mix(u 12%, #0b0b0f)` | — | Deepest background |
| `--mcc-bg-surface` | `= u` | — | Card/tile base |
| `--mcc-ground-1` | `mix(u 50%, #070a12)` | — | Hex grid background top |
| `--mcc-ground-2` | `mix(u 26%, #04060c)` | — | Hex grid background bottom |
| `--mcc-surface-2` | `mix(u 86%, white 14%)` | — | Elevated surface |
| `--mcc-panel` | `mix(u 46%, transparent)` | — | Glass panel fill |
| `--mcc-panel-solid` | — | — | Non-transparent panel (popover, toast) |
| `--mcc-border` | `rgba(255,255,255,.14)` | — | Panel/card border |
| `--mcc-text-main` | `#eef2f8` | — | Primary text |
| `--mcc-text-muted` | `mix(u 22%, #9aa6ba)` | — | Secondary/disabled text |
| `--mcc-top-veil` | extra-transparent u | — | Top bar + nav bar fill |
| `--mcc-glass-sheen` | gradient | — | Gloss overlay for glass surfaces |

**Clear-status (fixed):**
- None: `#f0c507`
- Soft: `#e1891d`
- Hard: `#22c55e`

**Primary green:** top `#3fce74`, bottom `#1fa353`, edge `#16753b`
**Danger red:** top `#f0685a`, bottom `#c5392c`, edge `#8f271d`

### Typography

| Role | Family | Weight |
|---|---|---|
| Display / headings | Fredoka | 600, 700, 800 |
| Body / UI | Nunito | 400, 600, 700, 800 |
| Seeds / hashes / version | monospace | — |

Loaded from Google Fonts in `src/app.css`.

### Spacing & radii

Spacing uses existing `--spacing-xs/sm/md/lg/xl` (4/8/16/24/32px).

| Context | Radius |
|---|---|
| Cards, accordions | 14–16px |
| Buttons | 10–14px |
| Pills, tags | 999px |
| Mine tiles | 9px |

---

## Glass surface pattern

```css
background: var(--mcc-panel);
background-image: var(--mcc-glass-sheen);
border: 1px solid var(--mcc-border);
box-shadow:
  0 2px 10px rgba(0,0,0,0.15),
  inset 0 1px 0 rgba(255,255,255,0.1);
```

**Gotcha:** glass buttons must set an explicit `background` (or reset UA `buttonface`). Without it
the browser's default light button colour shows through the translucent gloss and looks white.

Top bar and nav bar use `--mcc-top-veil` (extra-transparent) + `backdrop-filter: blur(12px)`.

---

## 3D primary button pattern

Used for Buy Miner (green) and Reset (red). Two `background-image` layers: colour gradient + sheen.
`box-shadow` bottom edge for the 3D lift. On `:active`: `translateY(3px)` + collapse the bottom edge.

```css
background-image:
  var(--mcc-btn-sheen),
  linear-gradient(180deg, var(--mcc-green-top), var(--mcc-green-bot));
box-shadow: 0 4px 0 var(--mcc-green-edge);
```

---

## Hex grid

Pointy-top hexagons with `clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)`
rotated 30deg via `transform: rotate(30deg)`.

**Cell colours:**
- `plot` — `color-mix(in srgb, var(--mcc-u) 55%, #4a78a8)`
- `city` — `linear-gradient(135deg, #bfa46e, #9a7f49)` (ochre)
- `factory` — `linear-gradient(135deg, #84799e, #5f5675)` (slate-violet)
- `empty` — `color-mix(in srgb, var(--mcc-u) 12%, var(--mcc-bg-surface))`
- `blocker` — `var(--mcc-tile-blocker)`
- `hidden` (undiscovered) — `color-mix(in srgb, var(--mcc-u) 30%, var(--mcc-bg-surface))` + fog SVG

**Selected cell:** gold ring via a `.hex-ring` span (same clip-path, `scale(1.14)`, gold fill,
`opacity:0` default → `opacity:1` on `.hex.selected`). Standard CSS border doesn't work on
clip-path shapes — the scaled-span approach is the workaround.

---

## App shell

- **Top bar:** translucent glass, currency pills only (🪙 money, 💡 engineering ideas), right-aligned. No title.
- **Nav tabs:** 5 tabs (World / Mine / Station / Engineering / Settings). Active tab: gold label +
  soft gold border/tint + 2px gold underline bar. On narrow (<610px): icon-only for inactive tabs,
  icon + label for the active tab.
- **Content area:** fills remaining height, scrolls internally per tab.
