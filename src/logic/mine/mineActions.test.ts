// src/logic/mine/mineActions.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { gameState } from '../app/gameState.svelte';
import { plotsStore } from './plotsStore.svelte';
import { isPlotBuilt } from './mineTypes';
import type { Miner, Mineshaft } from './mineTypes';
import { generatePlot, getClearStatus } from './mineGen';
import {
  BASE_SHAFT_COST,
  BUILD_COAL_COST,
  BUILD_MONEY_COST,
  digDeeper,
  ensurePlotScaffold,
  handleNextShaftAction,
  handlePreviousShaftAction,
  placeMiner,
  tryBuildPlot,
} from './mineActions';

const TEST_CELL = 'test-cell-1';
const SEED = 'test-seed';
const RESET_COUNT = 0;

beforeEach(() => {
  plotsStore.replaceAll({});
});

describe('ensurePlotScaffold', () => {
  it('creates a scaffold entry for a new cell', () => {
    ensurePlotScaffold(TEST_CELL);
    expect(plotsStore.has(TEST_CELL)).toBe(true);
  });

  it('scaffold is not built (isPlotBuilt returns false)', () => {
    ensurePlotScaffold(TEST_CELL);
    const plot = plotsStore.get(TEST_CELL)!;
    expect(isPlotBuilt(plot)).toBe(false);
  });

  it('is idempotent: calling twice leaves exactly one entry, still not built', () => {
    ensurePlotScaffold(TEST_CELL);
    const first = plotsStore.get(TEST_CELL)!;
    // Mutate to detect if the second call overwrites
    first.ageResources.coal = 99;

    ensurePlotScaffold(TEST_CELL);
    const second = plotsStore.get(TEST_CELL)!;
    expect(plotsStore.has(TEST_CELL)).toBe(true);
    // Should still have the mutation (not replaced)
    expect(second.ageResources.coal).toBe(99);
    expect(isPlotBuilt(second)).toBe(false);
  });
});

describe('tryBuildPlot', () => {
  it('returns ok:false when plot does not exist', () => {
    const result = tryBuildPlot('nonexistent', SEED, RESET_COUNT, 1000);
    expect(result).toEqual({ ok: false, nextMoney: 1000 });
  });

  it('returns ok:false when coal is below threshold', () => {
    ensurePlotScaffold(TEST_CELL);
    // coal defaults to 0, below BUILD_COAL_COST
    const result = tryBuildPlot(TEST_CELL, SEED, RESET_COUNT, BUILD_MONEY_COST);
    expect(result.ok).toBe(false);
    expect(isPlotBuilt(plotsStore.get(TEST_CELL)!)).toBe(false);
  });

  it('returns ok:false when money is below threshold', () => {
    ensurePlotScaffold(TEST_CELL);
    plotsStore.get(TEST_CELL)!.ageResources.coal = BUILD_COAL_COST;
    const result = tryBuildPlot(TEST_CELL, SEED, RESET_COUNT, BUILD_MONEY_COST - 1);
    expect(result.ok).toBe(false);
    expect(result.nextMoney).toBe(BUILD_MONEY_COST - 1);
    expect(isPlotBuilt(plotsStore.get(TEST_CELL)!)).toBe(false);
  });

  it('returns ok:false when plot is already built', () => {
    ensurePlotScaffold(TEST_CELL);
    plotsStore.get(TEST_CELL)!.ageResources.coal = BUILD_COAL_COST;
    // Build it once
    tryBuildPlot(TEST_CELL, SEED, RESET_COUNT, BUILD_MONEY_COST);
    // Try to build again
    const result = tryBuildPlot(TEST_CELL, SEED, RESET_COUNT, BUILD_MONEY_COST);
    expect(result.ok).toBe(false);
  });

  it('succeeds and returns nextMoney reduced by BUILD_MONEY_COST', () => {
    ensurePlotScaffold(TEST_CELL);
    plotsStore.get(TEST_CELL)!.ageResources.coal = BUILD_COAL_COST;
    const result = tryBuildPlot(TEST_CELL, SEED, RESET_COUNT, BUILD_MONEY_COST + 50);
    expect(result.ok).toBe(true);
    expect(result.nextMoney).toBe(50);
  });

  it('flips isPlotBuilt to true on success', () => {
    ensurePlotScaffold(TEST_CELL);
    plotsStore.get(TEST_CELL)!.ageResources.coal = BUILD_COAL_COST;
    tryBuildPlot(TEST_CELL, SEED, RESET_COUNT, BUILD_MONEY_COST);
    const plot = plotsStore.get(TEST_CELL)!;
    expect(isPlotBuilt(plot)).toBe(true);
  });

  it('exact boundary: coal === BUILD_COAL_COST and money === BUILD_MONEY_COST succeeds', () => {
    ensurePlotScaffold(TEST_CELL);
    plotsStore.get(TEST_CELL)!.ageResources.coal = BUILD_COAL_COST;
    const result = tryBuildPlot(TEST_CELL, SEED, RESET_COUNT, BUILD_MONEY_COST);
    expect(result).toEqual({ ok: true, nextMoney: 0 });
  });
});

describe('handleNextShaftAction', () => {
  // Depth 0 with every resource/rubble tile turned to dirt => getClearStatus === 'soft'.
  function seedSoftClearedPlot() {
    const surface = generatePlot(SEED, RESET_COUNT, 0, 0);
    surface.tiles = surface.tiles.map((row) => row.map((tile) => (tile.type === 'empty' ? tile : { ...tile, type: 'dirt' as const })));
    plotsStore.set(TEST_CELL, {
      currentAge: 'Mechanical',
      ageResources: { coal: 0, oil: 0, copper: 0, superalloy: 0 },
      mineshafts: [{ mineDepths: [surface], selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }],
      activeMineshaftIndex: 0,
      station: null,
    });
    return plotsStore.get(TEST_CELL)!;
  }

  /** The action spends from gameState directly, so stage the wallet first. */
  function nextShaft(money: number) {
    gameState.setMoney(money);
    const plot = plotsStore.get(TEST_CELL)!;
    const shaft = plot.mineshafts[plot.activeMineshaftIndex];
    return handleNextShaftAction({
      worldSeed: SEED,
      resetCount: RESET_COUNT,
      maxShafts: 5,
      activeShaftIndex: plot.activeMineshaftIndex,
      cellId: TEST_CELL,
      activeMineshaft: shaft,
      activeMine: shaft.mineDepths[shaft.activeDepthIndex],
    });
  }

  it('buying a shaft charges money AND grows plot.mineshafts', () => {
    seedSoftClearedPlot();
    const result = nextShaft(500);

    expect(result.ok).toBe(true);
    expect(gameState.current.money).toBe(500 - BASE_SHAFT_COST);

    const plot = plotsStore.get(TEST_CELL)!;
    expect(plot.mineshafts).toHaveLength(2);
    expect(plot.activeMineshaftIndex).toBe(1);
    // Seeded like shaft 0, but with shaftIndex 1 — not a blank default depth.
    expect(plot.mineshafts[1].mineDepths[0]).toEqual(generatePlot(SEED, RESET_COUNT, 0, 1));
  });

  it('refuses and leaves the plot untouched when money is short', () => {
    seedSoftClearedPlot();
    const result = nextShaft(BASE_SHAFT_COST - 1);

    expect(result.ok).toBe(false);
    expect(plotsStore.get(TEST_CELL)!.mineshafts).toHaveLength(1);
    // The wallet is the action's own now — a refusal must not have charged it.
    expect(gameState.current.money).toBe(BASE_SHAFT_COST - 1);
  });

  it('allows buying from a hard-cleared surface, not just a soft-cleared one', () => {
    const plot = seedSoftClearedPlot();
    // Hard-cleared: the dirt is gone too. Strictly more cleared than 'soft',
    // and it used to soft-lock the purchase because the guard was `!== 'soft'`.
    const surface = plot.mineshafts[0].mineDepths[0];
    surface.tiles = surface.tiles.map((row) => row.map((tile) => ({ ...tile, type: 'empty' as const, hp: 0 })));

    const result = nextShaft(500);

    expect(result.ok).toBe(true);
    expect(plotsStore.get(TEST_CELL)!.mineshafts).toHaveLength(2);
  });

  it('buys a shaft from a freshly dug depth, gating on the surface not the current level', () => {
    const plot = seedSoftClearedPlot();
    // Exactly what digDeeper leaves behind: an untouched, full-of-rubble depth 3
    // selected, above a cleared surface. Gating on the current depth blocks here.
    const deep = generatePlot(SEED, RESET_COUNT, 3, 0);
    deep.depth = 3;
    plot.mineshafts[0].mineDepths.push(deep);
    plot.mineshafts[0].activeDepthIndex = 1;
    expect(getClearStatus(deep)).toBe('none');

    const result = nextShaft(500);

    expect(result.ok).toBe(true);
    expect(plotsStore.get(TEST_CELL)!.mineshafts).toHaveLength(2);
    expect(gameState.current.money).toBe(500 - BASE_SHAFT_COST);
  });

  it('still refuses when the surface itself is uncleared', () => {
    const surface = generatePlot(SEED, RESET_COUNT, 0, 0);
    plotsStore.set(TEST_CELL, {
      currentAge: 'Mechanical',
      ageResources: { coal: 0, oil: 0, copper: 0, superalloy: 0 },
      mineshafts: [{ mineDepths: [surface], selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }],
      activeMineshaftIndex: 0,
      station: null,
    });

    const result = nextShaft(500);

    expect(result.ok).toBe(false);
    expect(gameState.current.money).toBe(500);
    expect(plotsStore.get(TEST_CELL)!.mineshafts).toHaveLength(1);
  });

  it('handlePreviousShaftAction actually moves back a shaft', () => {
    seedSoftClearedPlot();
    nextShaft(500); // buy shaft 1, which leaves us on it
    expect(plotsStore.get(TEST_CELL)!.activeMineshaftIndex).toBe(1);

    const result = handlePreviousShaftAction(TEST_CELL, 1);

    expect(result.ok).toBe(true);
    expect(plotsStore.get(TEST_CELL)!.activeMineshaftIndex).toBe(0);
  });

  it('handlePreviousShaftAction refuses on the first shaft', () => {
    seedSoftClearedPlot();

    const result = handlePreviousShaftAction(TEST_CELL, 0);

    expect(result.ok).toBe(false);
    expect(plotsStore.get(TEST_CELL)!.activeMineshaftIndex).toBe(0);
  });

  it('refuses past the shaft limit without charging', () => {
    seedSoftClearedPlot();
    gameState.setMoney(500);
    const plot = plotsStore.get(TEST_CELL)!;
    const shaft = plot.mineshafts[0];
    const result = handleNextShaftAction({
      worldSeed: SEED,
      resetCount: RESET_COUNT,
      maxShafts: 0,
      activeShaftIndex: 0,
      cellId: TEST_CELL,
      activeMineshaft: shaft,
      activeMine: shaft.mineDepths[0],
    });

    expect(result.ok).toBe(false);
    expect(gameState.current.money).toBe(500);
    expect(plotsStore.get(TEST_CELL)!.mineshafts).toHaveLength(1);
  });

  it('switches to an existing shaft without charging or appending', () => {
    seedSoftClearedPlot();
    nextShaft(500); // buy shaft 1
    plotsStore.setActiveMineshaftIndex(TEST_CELL, 0);

    const result = nextShaft(500);
    expect(result.ok).toBe(true);
    expect(gameState.current.money).toBe(500); // navigation is free
    expect(plotsStore.get(TEST_CELL)!.mineshafts).toHaveLength(2);
    expect(plotsStore.get(TEST_CELL)!.activeMineshaftIndex).toBe(1);
  });
});

describe('placeMiner', () => {
  function clearedDepth() {
    const depth = generatePlot(SEED, RESET_COUNT, 0, 0);
    depth.tiles = depth.tiles.map((row) => row.map((tile) => ({ ...tile, type: 'empty' as const, hp: 0 })));
    return depth;
  }

  it('places at the requested level, not always level 1', () => {
    const depth = clearedDepth();

    expect(placeMiner(depth, 5)).toBe(true);
    expect(depth.miners).toHaveLength(1);
    expect(depth.miners[0].level).toBe(5);
  });

  it('never stacks two miners on one tile', () => {
    const depth = clearedDepth();

    placeMiner(depth);
    placeMiner(depth);

    const indices = depth.miners.map((m) => m.tileIndex);
    expect(new Set(indices).size).toBe(indices.length);
  });

  it('returns false when the depth is full or missing', () => {
    const depth = clearedDepth();
    const capacity = depth.tiles.flat().filter((tile) => tile.type === 'empty').length;

    for (let i = 0; i < capacity; i++) {
      expect(placeMiner(depth)).toBe(true);
    }

    expect(placeMiner(depth)).toBe(false);
    expect(placeMiner(null)).toBe(false);
  });
});

describe('digDeeper', () => {
  function makeClearedShaft(minerCount: number): Mineshaft {
    const mineDepth = generatePlot(SEED, RESET_COUNT, 0, 0);
    // Fully clear the depth so getClearStatus reports 'hard'.
    mineDepth.tiles = mineDepth.tiles.map((row) => row.map((tile) => ({ ...tile, type: 'empty' as const, hp: 0 })));
    const miners: Miner[] = Array.from({ length: minerCount }, (_, i) => ({
      level: 1,
      tileIndex: i,
      facing: 0,
      progress: 0,
    }));
    mineDepth.miners = miners;

    return {
      mineDepths: [mineDepth],
      selectedMiner: null,
      draggedMiner: null,
      lastTick: 0,
      activeDepthIndex: 0,
    };
  }

  it("refuses to dig deeper when miners outnumber the next depth's empty tiles", () => {
    const shaft = makeClearedShaft(6); // next depth only has 5 empty (bottom-row) tiles
    const result = digDeeper(SEED, RESET_COUNT, 0, shaft);
    expect(result.ok).toBe(false);
    expect(shaft.mineDepths).toHaveLength(1);
  });

  it('digs deeper and gives every miner a unique tile when miners fit', () => {
    const shaft = makeClearedShaft(5);
    const result = digDeeper(SEED, RESET_COUNT, 0, shaft);
    expect(result.ok).toBe(true);
    expect(shaft.mineDepths).toHaveLength(2);

    const nextMine = shaft.mineDepths[1];
    const tileIndices = nextMine.miners.map((m) => m.tileIndex);
    expect(new Set(tileIndices).size).toBe(tileIndices.length);
  });
});
