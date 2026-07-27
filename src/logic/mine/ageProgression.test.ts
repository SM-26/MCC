// src/logic/mine/ageProgression.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { gameState } from '../app/gameState.svelte';
import { AGE_ADVANCE_COST, advanceAge, getMaxDepthForAge, getNextAge } from './ageProgression';
import { generatePlot } from './mineGen';
import type { PlotState } from './mineTypes';

const SEED = 'test-seed';
const RESET_COUNT = 0;

function makePlot(): PlotState {
  return {
    currentAge: 'Mechanical',
    ageResources: { coal: 0, oil: 0, copper: 0, superalloy: 0 },
    mineshafts: [{ mineDepths: [generatePlot(SEED, RESET_COUNT, 0, 0)], selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }],
    activeMineshaftIndex: 0,
    station: null,
  };
}

beforeEach(() => {
  gameState.setMoney(0);
});

describe('getNextAge', () => {
  it('walks the ladder and stops at Maglev', () => {
    expect(getNextAge('Mechanical')).toBe('Steam');
    expect(getNextAge('Electric')).toBe('Maglev');
    expect(getNextAge('Maglev')).toBeNull();
  });
});

describe('getMaxDepthForAge', () => {
  it('caps each age at the end of the bracket that funds the next one', () => {
    expect(getMaxDepthForAge('Mechanical')).toBe(9);
    expect(getMaxDepthForAge('Steam')).toBe(14);
    expect(getMaxDepthForAge('Diesel')).toBe(19);
    expect(getMaxDepthForAge('Electric')).toBe(24);
    expect(getMaxDepthForAge('Maglev')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('advanceAge', () => {
  it('charges money and ore, and bumps the age', () => {
    const plot = makePlot();
    plot.ageResources.coal = 60;
    gameState.setMoney(300);

    expect(advanceAge(plot).ok).toBe(true);
    expect(plot.currentAge).toBe('Steam');
    expect(gameState.current.money).toBe(300 - AGE_ADVANCE_COST.Steam.money);
    expect(plot.ageResources.coal).toBe(60 - 50);
  });

  it('refuses when short on money, charging nothing', () => {
    const plot = makePlot();
    plot.ageResources.coal = 60;
    gameState.setMoney(AGE_ADVANCE_COST.Steam.money - 1);

    expect(advanceAge(plot).ok).toBe(false);
    expect(plot.currentAge).toBe('Mechanical');
    expect(gameState.current.money).toBe(AGE_ADVANCE_COST.Steam.money - 1);
    expect(plot.ageResources.coal).toBe(60);
  });

  it('refuses when short on ore, charging nothing', () => {
    const plot = makePlot();
    plot.ageResources.coal = 49;
    gameState.setMoney(1000);

    expect(advanceAge(plot).ok).toBe(false);
    expect(plot.currentAge).toBe('Mechanical');
    expect(gameState.current.money).toBe(1000);
    expect(plot.ageResources.coal).toBe(49);
  });

  it('refuses at Maglev without charging', () => {
    const plot = makePlot();
    plot.currentAge = 'Maglev';
    plot.ageResources.superalloy = 999;
    gameState.setMoney(99999);

    expect(advanceAge(plot).ok).toBe(false);
    expect(gameState.current.money).toBe(99999);
    expect(plot.ageResources.superalloy).toBe(999);
  });

  it('counts ore mined in a second shaft — the cap is a ceiling, not a prerequisite', () => {
    const plot = makePlot();
    // Two shallow shafts, neither anywhere near the depth cap. ageResources pools
    // across shafts, so the combined haul must still buy the age.
    plot.mineshafts.push({ mineDepths: [generatePlot(SEED, RESET_COUNT, 0, 1)], selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 });
    plot.ageResources.coal = 25; // shaft 0
    plot.ageResources.coal += 25; // shaft 1
    gameState.setMoney(AGE_ADVANCE_COST.Steam.money);

    expect(advanceAge(plot).ok).toBe(true);
    expect(plot.currentAge).toBe('Steam');
  });
});

describe('bracket yield vs advance cost', () => {
  it('the coal bracket (depths 5-9) yields at least the Steam cost', () => {
    let coal = 0;
    for (let depth = 5; depth <= getMaxDepthForAge('Mechanical'); depth++) {
      coal += generatePlot(SEED, RESET_COUNT, depth, 0)
        .tiles.flat()
        .filter((tile) => tile.type === 'coal')
        .reduce((sum, tile) => sum + tile.value, 0);
    }
    expect(coal).toBeGreaterThanOrEqual(AGE_ADVANCE_COST.Steam.resources.coal!);
  });
});
