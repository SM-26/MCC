// src/logic/mine/mineActions.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { plotsStore } from './plotsStore.svelte';
import { isPlotBuilt } from './mineTypes';
import type { Miner, Mineshaft } from './mineTypes';
import { generatePlot } from './mineGen';
import { BUILD_COAL_COST, BUILD_MONEY_COST, digDeeper, ensurePlotScaffold, tryBuildPlot } from './mineActions';

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

describe('digDeeper', () => {
  function makeClearedShaft(minerCount: number): Mineshaft {
    const mineDepth = generatePlot(SEED, RESET_COUNT, 0, 0);
    // Fully clear the depth so getClearStatus reports 'hard'.
    mineDepth.tiles = mineDepth.tiles.map((row) =>
      row.map((tile) => ({ ...tile, type: 'empty' as const, hp: 0 })),
    );
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

  it('refuses to dig deeper when miners outnumber the next depth\'s empty tiles', () => {
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
