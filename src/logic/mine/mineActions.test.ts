// src/logic/mine/mineActions.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { plotsStore } from './plotsStore.svelte';
import { isPlotBuilt } from './mineTypes';
import { BUILD_COAL_COST, BUILD_MONEY_COST, ensurePlotScaffold, tryBuildPlot } from './mineActions';

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
