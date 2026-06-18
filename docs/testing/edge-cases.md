# Edge Cases Testing Guide

This guide helps you quickly identify and test edge cases in the MCC game without having to play through entire worlds. Each test can be done in under 2 minutes.

## Quick Test Commands

```bash
# Run all tests (fastest)
pnpm test:run

# Run specific test file
pnpm test:run src/logic/integration/sync.test.ts

# Run world generation tests
pnpm test:run src/logic/world/worldGen.test.ts

# Check for TypeScript errors
pnpm check
```

---

## World Map Tab Edge Cases

### 1. Ring Generation Completeness

**What to test:** Verify all rings generate correctly

**Steps:**
1. Open World View tab
2. Look at the hex grid
3. Count tiles in each ring:
   - Ring 0 (center): Should have exactly 1 tile (the starting plot)
   - Ring 1: Should have exactly 6 tiles
   - Ring 2+: Should have 6×ring tiles

**Expected:** 
- Ring 0: 1 tile ✅
- Ring 1: 6 tiles ✅
- Each subsequent ring: 6 more tiles than previous

**Edge case to catch:** Missing tiles or wrong ring sizes indicate generation bug.

### 2. Fog Tile Revelation

**What to test:** Verify fog tiles reveal into valid types

**Steps:**
1. Select a fog tile in ring 1
2. Send a train there (any train works)
3. Observe what the tile reveals as

**Expected outcomes:**
- ✅ Reveals as `city`, `factory`, `plot`, or `empty`
- ❌ Should NOT reveal as `fog` (already revealed)
- ❌ Should NOT reveal as `blocker` in rings 0-3

**Edge case to catch:** Invalid tile types after revelation.

### 3. Name Pool Exhaustion

**What to test:** Verify behavior when name pools are exhausted

**Steps:**
1. Create multiple worlds with same seed
2. Watch for "Plot name pool exhausted" log message
3. Observe what happens when names run out

**Expected:**
- First world: All plots/cities get unique names ✅
- After exhaustion: Should see log message ⚠️
- After exhaustion: May get `blocker` instead of plot/city 🚨

**Edge case to catch:** Game breaks when name pools exhausted.

### 4. Plot Selection Consistency

**What to test:** Verify selected plot matches world cell

**Steps:**
1. Discover a plot tile
2. Click on it
3. Check details panel shows correct info

**Expected:**
- Details show plot name ✅
- Type shows "plot" ✅
- Can navigate to mine tab ✅

**Edge case to catch:** Plot not found in plots array after discovery.

---

## Mine Tab Edge Cases

### 1. Miner Placement Validation

**What to test:** Verify miners can only be placed on valid tiles

**Steps:**
1. Buy a miner
2. Try to drag miner to each tile type:
   - Empty tile ✅ (should accept)
   - Rubble tile ❌ (should reject)
   - Resource tile ❌ (should reject)
   - Blocker tile ❌ (should reject)

**Expected:**
- Only empty tiles accept miners ✅
- Other tiles show error message or toast ❌

**Edge case to catch:** Miners placed on invalid tiles.

### 2. Mining Tick Consistency

**What to test:** Verify mining runs every second

**Steps:**
1. Place a miner on a resource tile
2. Watch money counter
3. Time how long until money increases

**Expected:**
- Money should increase approximately every second ✅
- Tile should clear after enough damage ✅

**Edge case to catch:** Mining tick not running or running too fast/slow.

### 3. Miner Merge Behavior

**What to test:** Verify miners can merge on same tile

**Steps:**
1. Place two miners on same tile
2. Observe what happens

**Expected:**
- Miners should merge into one stronger miner ✅
- Or show merge error message if not allowed ❌

**Edge case to catch:** Miners stacking without merging.

### 4. Depth Expansion

**What to test:** Verify digging deeper works correctly

**Steps:**
1. Clear all tiles at current depth
2. Click "Dig Deeper" button
3. Observe new depth generation

**Expected:**
- New depth generates with correct tile types ✅
- Blockers don't appear until depth ≥2 ✅
- Grid dimensions match config (5x5) ✅

**Edge case to catch:** Wrong tile types or blockers at wrong depths.

---

## Expansion Edge Cases

### 1. Shaft Unlocking

**What to test:** Verify shafts unlock in correct order

**Steps:**
1. Buy first miner
2. Clear current shaft
3. Try to buy next shaft

**Expected:**
- Can buy shaft when have enough money ✅
- Each shaft generates with same seed ✅
- Tile distribution similar but not identical ✅

**Edge case to catch:** Wrong tile distribution between shafts.

### 2. Multiple Miners Across Shafts

**What to test:** Verify miners work across multiple shafts

**Steps:**
1. Unlock second shaft
2. Buy miner in first shaft
3. Buy miner in second shaft
4. Mine in both shafts

**Expected:**
- Each shaft has independent mine state ✅
- Miners don't interfere with each other ✅
- Money accumulates from both shafts ✅

**Edge case to catch:** Miners affecting wrong shaft's tiles.

---

## Save/Load Edge Cases

### 1. Autosave Timing

**What to test:** Verify autosave happens at right times

**Steps:**
1. Buy a miner
2. Wait ~1 second
3. Check if save happened (look for log or try reload)

**Expected:**
- Saves after buying miner ✅
- Saves after mining tick ✅
- Saves after tab change ✅

**Edge case to catch:** Save not happening, losing progress.

### 2. Manual Save

**What to test:** Verify manual save works

**Steps:**
1. Make several changes (buy miners, dig deeper)
2. Click manual save button
3. Refresh browser
4. Check if state loaded correctly

**Expected:**
- Money matches ✅
- Plot count matches ✅
- Mine states match ✅
- All miners in correct positions ✅

**Edge case to catch:** Partial save or corrupted save data.

### 3. Load from Different Seed

**What to test:** Verify can't load wrong save

**Steps:**
1. Create world with seed "123456"
2. Change seed setting to "999999"
3. Try to load old save

**Expected:**
- Should either ignore old save ✅
- Or show warning about mismatched seed ⚠️

**Edge case to catch:** Loading wrong world data.

---

## Performance Edge Cases

### 1. Large Number of Miners

**What to test:** Verify performance with many miners

**Steps:**
1. Buy as many miners as possible
2. Fill entire grid with miners
3. Observe frame rate and responsiveness

**Expected:**
- UI remains responsive ✅
- Mining ticks still run ✅
- No browser lag or crashes ✅

**Edge case to catch:** Performance degradation with many miners.

### 2. Rapid Tab Switching

**What to test:** Verify rapid tab switching doesn't break state

**Steps:**
1. Quickly switch between tabs: World → Mine → Station → World → Mine
2. Do this 20+ times rapidly
3. Check if state remains consistent

**Expected:**
- Active plot stays correct ✅
- No duplicate plots created ✅
- UI updates smoothly ✅

**Edge case to catch:** State corruption from rapid switching.

### 3. Long Play Session

**What to test:** Verify no memory leaks over time

**Steps:**
1. Play for 30+ minutes
2. Buy miners, dig depths, expand shafts
3. Open DevTools → Memory tab
4. Take snapshot
5. Refresh browser
6. Take another snapshot
7. Compare memory usage

**Expected:**
- Memory usage similar before/after ✅
- No significant increase ❌

**Edge case to catch:** Memory leaks from intervals, event listeners, etc.

---

## Edge Case Checklist

Use this checklist for systematic testing:

```
[ ] World Map Tab
    [ ] Ring generation completeness
    [ ] Fog tile revelation
    [ ] Name pool exhaustion
    [ ] Plot selection consistency

[ ] Mine Tab
    [ ] Miner placement validation
    [ ] Mining tick consistency
    [ ] Miner merge behavior
    [ ] Depth expansion

[ ] Expansion
    [ ] Shaft unlocking
    [ ] Multiple miners across shafts

[ ] Save/Load
    [ ] Autosave timing
    [ ] Manual save
    [ ] Load from different seed

[ ] Performance
    [ ] Large number of miners
    [ ] Rapid tab switching
    [ ] Long play session

[ ] Unit Tests
    [ ] Run all tests: pnpm test:run
    [ ] Check for new failures after changes
```

---

## Quick Debug Commands

```bash
# Check for TypeScript errors
pnpm check

# Run all tests
pnpm test:run

# Run specific test file
pnpm test:run src/logic/integration/sync.test.ts

# Watch mode (auto-runs on file change)
pnpm test

# Preview build
pnpm preview
```

---

## Common Bug Patterns to Look For

### 1. State Drift Between World and Mine

**Symptoms:**
- Plot selected in world but mine shows wrong plot
- Plot count in world doesn't match plots array

**Cause:**
- `setActivePlotByCellId()` called but plot not in plots array
- Missing call to `createPlotFromCell()`

**Fix:**
Ensure `createPlotFromCell()` is called when discovering new plot.

### 2. Memory Leak from Intervals

**Symptoms:**
- Memory usage increases over time
- Mining tick still running after component destroyed

**Cause:**
- Interval not cleared in `onDestroy()`
- Event listeners not removed

**Fix:**
Always return cleanup function from `onMount()`:
```typescript
onMount(() => {
  interval = setInterval(handleMiningTick, 1000);
  window.addEventListener('resize', handleResize);
  
  return () => {
    clearInterval(interval);
    window.removeEventListener('resize', handleResize);
  };
});
```

### 3. Deterministic Generation Broken

**Symptoms:**
- Same seed produces different worlds
- Mine tiles don't match expected pattern

**Cause:**
- RNG seed string changed
- Different reset count used

**Fix:**
Ensure seed string format is consistent:
```typescript
const seedString = `${worldSeed}-${resetCount}`;
const rng = seedrandom(seedString);
```

### 4. Type Assertion Masking Errors

**Symptoms:**
- TypeScript errors hidden by `as TabId`
- Runtime type mismatches

**Cause:**
- Using type assertions instead of proper typing

**Fix:**
Use function binding for better type safety:
```svelte
<Tabs.Root 
  bind:value={(getValue, setValue) => ({
    getValue: () => currentTab,
    setValue: (tab: string) => handleTabChange(tab as TabId)
  })}
>
```

---

## Summary

This testing guide helps you:
- ✅ Catch edge cases quickly (under 2 minutes each)
- ✅ Verify world-mine synchronization
- ✅ Identify performance issues early
- ✅ Prevent regressions after refactoring

**Key takeaway:** Run unit tests first (`pnpm test:run`), then do targeted manual tests for specific features you're working on.
