// src/logic/station/stationActions.test.ts
import { describe, it, expect } from 'vitest';
import { createEmptyAgeResources, createMineTile } from '../mine/mineTypes';
import type { MineDepthState, PlotState } from '../mine/mineTypes';
import { buildPlatform, buildStation, isPlatformDepth } from './stationActions';
import { getPlatformCost } from './stationBalance';

export function makeClearedDepth(depth: number): MineDepthState {
  // A 1×1 grid holding a hard-cleared (empty) tile — getClearStatus() === 'hard'.
  return { depth, rows: 1, cols: 1, tiles: [[createMineTile('empty')]], miners: [] };
}

export function makeTestPlot(depths: number[] = [0]): PlotState {
  return {
    currentAge: 'Steam',
    ageResources: { ...createEmptyAgeResources(), coal: 50 },
    mineshafts: [{ mineDepths: depths.map(makeClearedDepth), selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }],
    activeMineshaftIndex: 0,
    station: null,
  };
}

describe('isPlatformDepth', () => {
  it('accepts 0, 6, 11, 16 and rejects 1', () => {
    expect(isPlatformDepth(0)).toBe(true);
    expect(isPlatformDepth(1)).toBe(false);
    expect(isPlatformDepth(6)).toBe(true);
    expect(isPlatformDepth(11)).toBe(true);
    expect(isPlatformDepth(16)).toBe(true);
    expect(isPlatformDepth(5)).toBe(false);
  });
});

describe('buildPlatform cost', () => {
  it('charges money and current-age resources per getPlatformCost', () => {
    const plot = makeTestPlot([0, 6]);
    const built = buildStation(plot, 1000, '0,0');
    expect(built.ok).toBe(true);

    const cost = getPlatformCost(6, 'Steam');
    const result = buildPlatform(plot.station!, plot, 0, 6, 1000);
    expect(result.ok).toBe(true);
    expect(result.nextMoney).toBe(1000 - cost.money);
    expect(plot.ageResources.coal).toBe(50 - (cost.resources.coal ?? 0));
  });

  it('rejects when age resources are insufficient', () => {
    const plot = makeTestPlot([0, 6]);
    plot.ageResources.coal = 0;
    buildStation(plot, 1000, '0,0');

    const result = buildPlatform(plot.station!, plot, 0, 6, 1000);
    expect(result.ok).toBe(false);
    expect(plot.station!.platforms).toHaveLength(1);
  });

  it('no longer offers depth 1', () => {
    const plot = makeTestPlot([0, 1, 6]);
    buildStation(plot, 1000, '0,0');
    const result = buildPlatform(plot.station!, plot, 0, 1, 1000);
    expect(result.ok).toBe(false);
  });
});
