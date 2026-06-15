// src/logic/mine/mineTypes.test.ts

import { describe, expect, it } from 'vitest';

import type { MineDepthState, MineTile, NorthExpansion, PlotState } from './mineTypes';

import { createEmptyAgeResources, createMineTile, getActiveMineDepth, getActiveNorthExpansion, getMineDepthByDepth } from './mineTypes';

function makeTile(overrides: Partial<MineTile> = {}): MineTile {
  return createMineTile('empty', overrides);
}

function makeDepth(depth: number, overrides: Partial<MineDepthState> = {}): MineDepthState {
  return {
    depth,
    rows: 2,
    cols: 2,
    tiles: [
      [makeTile(), makeTile()],
      [makeTile(), makeTile()],
    ],
    miners: [],
    ...overrides,
  };
}

function makeExpansion(overrides: Partial<NorthExpansion> = {}): NorthExpansion {
  return {
    mineDepths: [makeDepth(0)],
    selectedMiner: null,
    draggedMiner: null,
    lastTick: 0,
    activeDepthIndex: 0,
    ...overrides,
  };
}

function makePlot(overrides: Partial<PlotState> = {}): PlotState {
  return {
    plotId: 'plot-0',
    plotName: 'Prague',
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    northExpansions: [makeExpansion()],
    activeNorthExpansionIndex: 0,
    station: null,
    ...overrides,
  };
}

describe('createEmptyAgeResources', () => {
  it('returns all age resources initialized to 0', () => {
    expect(createEmptyAgeResources()).toEqual({
      coal: 0,
      oil: 0,
      copper: 0,
      superalloy: 0,
    });
  });

  it('returns a fresh object each time', () => {
    const first = createEmptyAgeResources();
    const second = createEmptyAgeResources();

    first.coal = 10;

    expect(second).toEqual({
      coal: 0,
      oil: 0,
      copper: 0,
      superalloy: 0,
    });
  });
});

describe('createMineTile', () => {
  it('creates an empty tile with default values', () => {
    expect(createMineTile()).toEqual({
      type: 'empty',
      level: 1,
      hp: 0,
      maxHp: 0,
      value: 0,
      resourceType: 'none',
    });
  });

  it('uses the matching resourceType for resource tiles', () => {
    expect(createMineTile('coal').resourceType).toBe('coal');
    expect(createMineTile('oil').resourceType).toBe('oil');
    expect(createMineTile('copper').resourceType).toBe('copper');
    expect(createMineTile('superalloy').resourceType).toBe('superalloy');
  });

  it('uses resourceType none for non-resource tiles', () => {
    expect(createMineTile('empty').resourceType).toBe('none');
    expect(createMineTile('dirt').resourceType).toBe('none');
    expect(createMineTile('blocker').resourceType).toBe('none');
    expect(createMineTile('rubble').resourceType).toBe('none');
  });

  it('allows overrides to replace defaults', () => {
    expect(
      createMineTile('coal', {
        hp: 5,
        maxHp: 10,
        value: 25,
        level: 3,
        resourceType: 'money',
      }),
    ).toEqual({
      type: 'coal',
      level: 3,
      hp: 5,
      maxHp: 10,
      value: 25,
      resourceType: 'money',
    });
  });
});

describe('getActiveNorthExpansion', () => {
  it('returns the active north expansion by index', () => {
    const first = makeExpansion({ lastTick: 1 });
    const second = makeExpansion({ lastTick: 2 });

    const plot = makePlot({
      northExpansions: [first, second],
      activeNorthExpansionIndex: 1,
    });

    expect(getActiveNorthExpansion(plot)).toBe(second);
  });

  it('returns null when the active index is out of bounds', () => {
    const plot = makePlot({
      northExpansions: [makeExpansion()],
      activeNorthExpansionIndex: 99,
    });

    expect(getActiveNorthExpansion(plot)).toBeNull();
  });

  it('returns null when there are no north expansions', () => {
    const plot = makePlot({
      northExpansions: [],
      activeNorthExpansionIndex: 0,
    });

    expect(getActiveNorthExpansion(plot)).toBeNull();
  });
});

describe('getActiveMineDepth', () => {
  it('returns the active mine depth from the active north expansion', () => {
    const depth0 = makeDepth(0);
    const depth1 = makeDepth(1);

    const expansion = makeExpansion({
      mineDepths: [depth0, depth1],
      activeDepthIndex: 1,
    });

    const plot = makePlot({
      northExpansions: [expansion],
      activeNorthExpansionIndex: 0,
    });

    expect(getActiveMineDepth(plot)).toBe(depth1);
  });

  it('returns null when there is no active north expansion', () => {
    const plot = makePlot({
      northExpansions: [],
      activeNorthExpansionIndex: 0,
    });

    expect(getActiveMineDepth(plot)).toBeNull();
  });

  it('returns null when the active depth index is out of bounds', () => {
    const expansion = makeExpansion({
      mineDepths: [makeDepth(0)],
      activeDepthIndex: 99,
    });

    const plot = makePlot({
      northExpansions: [expansion],
      activeNorthExpansionIndex: 0,
    });

    expect(getActiveMineDepth(plot)).toBeNull();
  });
});

describe('getMineDepthByDepth', () => {
  it('returns the matching mine depth by depth number', () => {
    const depth0 = makeDepth(0);
    const depth2 = makeDepth(2);
    const expansion = makeExpansion({
      mineDepths: [depth0, depth2],
    });

    expect(getMineDepthByDepth(expansion, 2)).toBe(depth2);
  });

  it('returns null when the depth does not exist', () => {
    const expansion = makeExpansion({
      mineDepths: [makeDepth(0), makeDepth(1)],
    });

    expect(getMineDepthByDepth(expansion, 5)).toBeNull();
  });

  it('returns null when the expansion has no mine depths', () => {
    const expansion = makeExpansion({
      mineDepths: [],
    });

    expect(getMineDepthByDepth(expansion, 0)).toBeNull();
  });
});
