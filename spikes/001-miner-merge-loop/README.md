# Spike #001: Miner Merge Loop Prototype

## Goal
Validate that the mining board loop is fun enough to justify building the rest of **Merge & Choo-Choo**.

This prototype exists to answer one primary question: is the merge-based miner placement and grid-clearing loop satisfying on its own in a mobile-first idle format?

## What This Is
This is a **minimum viable prototype** of the mining layer only.

It is not a vertical slice of the full game. It is a focused spike intended to prove that the tactile excavation loop works on phone screens and feels good over repeated short sessions.

## Question Being Answered

Can a player enjoy and understand the following loop without trains, prestige, or multi-city systems?

- Buy miners.
- Place miners on a grid.
- Let them clear rubble and dirt.
- Merge miners to improve performance.
- Earn money from valuable cells.
- Clear enough of the board to unlock the next decision.

If this loop is not fun, readable, and replayable, then the wider train/station game should not move into production yet.

## Scope

### In Scope

- One city only.
- One or more north plots, if manually enabled for testing.
- Grid-based mining board.
- Portrait mobile-first layout.
- Miners as individual units.
- Buy miner.
- Place miner on empty tile.
- Miner facing in a cardinal direction.
- Automatic mining over time.
- Merge two same-level miners into one higher-level miner.
- Dirt cells.
- Rubble / ore cells with value.
- Empty cells.
- Money economy from valuable cells.
- Digging down to the next level after hard clear.
- Unlocking north plot purchase after soft clear.
- Offline progress at reduced mining rate.
- Placeholder values stored as variables.

### Out of Scope

- Train stations.
- Train routes.
- Passenger transport.
- Cargo transport.
- Factory interactions.
- Multi-city world map.
- Exploration system.
- Age progression UI.
- Engineering Ideas tree as a real feature.
- Permanent prestige progression.
- Final visuals, theme, or polish.
- Save compatibility with future versions.

### Core Mechanics Implemented
- ✅ Single miner clearing rubble tiles over time
- ✅ Merge mechanic (2 same-level miners → 1 next level)
- ✅ Visual progress bars and animations
- ✅ Money economy (rubble → dirt → sell for cash)
- ✅ Tile expansion system
- ✅ Mobile portrait layout

### NOT Yet Implemented (Future Spikes)
- ⏳ Multi-city exploration
- ⏳ Station building
- ⏳ Train routes
- ⏳ Age progression (coal → steam → diesel, etc.)
- ⏳ Underground platforms
- ⏳ Prestige/EI system

## Prototype Summary

The player starts on a rectangular mining grid at level 0. The initial board size is 5x5. Each cell can be dirt, rubble/ore, or empty. Rubble/ore has value. Dirt has no value. Both dirt and rubble/ore behave as destructible cells with a level or strength value.

The player buys miners, places them onto empty cells, and each miner automatically mines the adjacent tile it faces. Miners can be rotated freely and automatically retarget based on the current targeting rule. Multiple miners may attack the same cell from different sides.

Once enough of the grid is cleared, the player can either dig downward or buy a new north plot, depending on which unlock condition has been met.

## Core Rules

### Board Rules

- Each mining level is a rectangular grid.
- Level 0 starts at 5x5.
- Future grid scaling exists, but exact growth is TBD and should be handled through variables.
- Grid remains rectangular in MVP1.
- Each plot has its own separate depth stack.
- New north plots start at level 0 and use the same starter grid size.

### Cell Types

- **Dirt** — no money value, blocks progress.
- **Rubble / Ore** — has money value, blocks progress.
- **Empty Cell** — can hold a miner.

### Miner Rules

- Miners are bought individually.
- Miners belong to a specific plot.
- Miners cannot be moved from plot 1 to plot 2.
- A miner occupies one empty cell.
- A miner mines one adjacent cardinal-direction cell.
- Miners may be repositioned freely on their own plot.
- Miners rotate instantly and automatically.
- Multiple miners may target the same cell from different sides.
- Miners auto-retarget when their current target is destroyed.
- Default targeting behavior is: ore/rubble before dirt, then lowest HP target.
- Auto-retargeting should be implemented as a setting-capable system, even if MVP1 only exposes a default mode.

### Merge Rules

- Two miners of the same level can be merged into one miner of the next level.
- Merge should preserve the best possible clarity and feedback, even with placeholder art.
- Merge animation can be simple in MVP1, but the action must still feel clear and rewarding.

### Damage / Time Rules

- Each dirt/rubble cell has a level or HP value.
- Each miner has a level.
- A miner of level X destroys a cell of level Y over time T.
- The exact formula for T should be a configurable placeholder variable for MVP1.
- The first implementation should prioritize clarity and tunability over realism.

## Unlock Rules

### Dig Down

- Digging downward requires a **hard clear** of the current level.
- Hard clear means every dirt and rubble/ore cell is removed.
- Only then can the player move to the next mine level.

### Buy North Plot

- Buying a north plot requires a **soft clear** of the current grid.
- Soft clear means all rubble/ore cells are removed, but dirt may remain.
- Buying a north plot also costs money.
- North plot availability is later intended to be controlled by the EI tree, but in MVP1 this should be handled by placeholder variables.

## Economy

### Money Sources

- Valuable rubble/ore cells provide money.
- Dirt provides no money.
- The exact value per cleared rubble/ore cell should be driven by variables.
- North plot purchase cost should also be variable-driven.
- Miner purchase cost should be variable-driven.

### Economy Purpose in MVP1

The economy only needs to answer three questions:

- Can the player afford enough miners to stay engaged?
- Does clearing valuable cells feel rewarding?
- Does the player understand the trade-off between spending money on miners versus spending money on expansion?

No broader train, age, or prestige economy is required in this prototype.

## Offline Progress

- Mining continues while offline.
- Offline mining runs at half rate.
- The first implementation can simulate this using time delta on return.
- Offline results should be readable and easy to verify for testing.

## Navigation and UI

### Navigation Model

The current navigation concept uses six directional controls in the top-left area:

- **Up** — move one mine level up.
- **Down** — move one mine level down.
- **Forward** — move to the next north plot.
- **Backward** — move to the previous north plot.
- **Left** — reserved for switching from mine view toward station view later.
- **Right** — reserved for switching from mine view toward station view later.

For MVP1, only the mining-relevant navigation needs to function. The left/right controls may exist as placeholders or may be omitted until the station spike exists.

### UI Priorities

- Must work in portrait orientation first.
- Board must be readable on a phone screen.
- Miner placement must be clear by touch.
- Merge action must be obvious.
- Available actions must be visible without deep menu nesting.
- The player should understand whether they are blocked by money, miner cap, or clear conditions.

## How to Play

### On Windows (Direct)
1. Open `index.html` in any browser (Chrome, Firefox, Edge)
2. Buy level 1 miners ($50 each)
3. Watch them clear rubble tiles
4. When a tile is cleared, it reveals resources (coal, oil, copper, etc.)
5. Sell rubble for money → expand plot → buy more miners

### On Mobile (Recommended)
1. Transfer `index.html` to your phone
2. Open with any mobile browser
3. Play in portrait mode (optimized for thumbs!)

## Success Criteria

This prototype is considered successful if:

- A new player can understand the board within a short session.
- Buying and placing miners feels intuitive.
- Merge feels satisfying enough to repeat.
- The economy does not stall too early or spiral too fast.
- Soft clear and hard clear are understandable as different gates.
- The player has a clear reason to buy miners, merge miners, or expand.
- The prototype is enjoyable for repeated short sessions on mobile.


## Game Loop

```
1. Buy miner ($50)
   ↓
2. Miner clears rubble (visual progress bar)
   ↓
3. Tile cleared → reveals resource (coal/oil/copper/etc.)
   ↓
4. Sell rubble or expand plot
   ↓
5. Repeat!
```

## Testing Checklist

### Basic Functionality

- [ ] Can a miner be bought?
- [ ] Can a miner be placed on an empty tile?
- [ ] Does the miner mine an adjacent target correctly?
- [ ] Can multiple miners hit the same target?
- [ ] Does target destruction correctly convert a cell to empty?
- [ ] Does rubble/ore grant money?
- [ ] Does dirt grant no money?
- [ ] Can two same-level miners be merged?
- [ ] Does the merged miner have the correct new level?

### Progression

- [ ] Does soft clear unlock north plot purchase?
- [ ] Does hard clear unlock dig down?
- [ ] Does buying a north plot consume money?
- [ ] Does a new north plot begin at level 0?
- [ ] Does each plot keep its own separate depth?
- [ ] Is miner cap enforced per city?

### UX

- [ ] Is the board readable in portrait layout?
- [ ] Are touch controls responsive?
- [ ] Is auto-retarget behavior understandable?
- [ ] Is the player told why an action is unavailable?
- [ ] Is offline progress easy to understand?

## Known Placeholder Values

These systems should be implemented as configurable variables instead of final balance decisions:

- Miner purchase cost.
- Rubble/ore value.
- Merge scaling.
- Miner damage/time formula.
- Cell HP by level.
- Grid scaling by depth.
- North plot purchase cost.
- Miner cap size.
- Offline progress multiplier.

## Known Risks

- The grid may feel too small or too large on portrait screens.
- Merge may not feel satisfying without strong feedback.
- The economy may create dead time if miner costs scale too fast.
- Soft clear vs hard clear may confuse players if the UI is unclear.
- Free miner movement may reduce commitment and make decisions feel too reversible.

## Technical Notes

- **Target stack:** lightweight web prototype.
- **Suggested stack:** Vanilla HTML, CSS, and JavaScript or TypeScript with minimal dependencies.
- **Target format:** mobile-first browser prototype.
- **Persistence:** simple local save is acceptable for testing, but final persistence design is out of scope.
- **Performance target:** smooth interaction on mid-range phones.
- **Rendering target:** clear 2D grid UI over fancy visuals.

## Recommended Dev Constraints

- Use placeholder shapes and colors before art.
- Use variables for all balance values.
- Avoid building station/train systems into this spike.
- Avoid adding prestige logic beyond simple debug variables.
- Build only enough UI to validate the mining loop.

## What This Prototype Must Teach

By the end of MVP1, the team should know:

- Whether merge-mining is fun enough to carry the opening of the game.
- Whether the board is readable on mobile.
- Whether the economy supports short repeatable sessions.
- Whether the soft-clear / hard-clear split is a good progression structure.
- Whether plot-based expansion feels promising before train systems are added.

## Next Spike

If MVP1 validates well, the next prototype should focus on the first station layer.

### Candidate Next Spike

**Spike #002 - Station & First Train Loop**

That spike would likely test:

- Building a station on a developed plot.
- Creating one train per platform.
- Sending trains on a simple route.
- Collecting payout and resending.
- Determining whether the mining loop and train loop reinforce each other.


---
**Purpose:** Validate mining loop before building the full game  
**Project:** Merge & Choo-Choo  
**Status:**  
**Timeline:**   
**Next Spike:** #002 - Station & Train Loop (once core loop validated)  
