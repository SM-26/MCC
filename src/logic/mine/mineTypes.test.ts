// src/logic/mine/mineTypes.test.ts

import { describe, expect, it } from 'vitest';

import type { MineDepthState, MineTile, Mineshaft, PlotState } from './mineTypes';

import {
  createEmptyAgeResources,
  createMineTile,
  createScaffoldPlot,
  getActiveMineDepth,
  getActiveMineshaft,
  getMineDepthByDepth,
  isPlotBuilt,
} from './mineTypes';

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

function makeMineshaft(overrides: Partial<Mineshaft> = {}): Mineshaft {
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
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    mineshafts: [makeMineshaft()],
    activeMineshaftIndex: 0,
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

describe('getActiveMineshaft', () => {
  it('returns the active mineshaft by index', () => {
    const first = makeMineshaft({ lastTick: 1 });
    const second = makeMineshaft({ lastTick: 2 });

    const plot = makePlot({
      mineshafts: [first, second],
      activeMineshaftIndex: 1,
    });

    expect(getActiveMineshaft(plot)).toBe(second);
  });

  it('returns null when the active index is out of bounds', () => {
    const plot = makePlot({
      mineshafts: [makeMineshaft()],
      activeMineshaftIndex: 99,
    });

    expect(getActiveMineshaft(plot)).toBeNull();
  });

  it('returns null when there are no mineshafts', () => {
    const plot = makePlot({
      mineshafts: [],
      activeMineshaftIndex: 0,
    });

    expect(getActiveMineshaft(plot)).toBeNull();
  });
});

describe('getActiveMineDepth', () => {
  it('returns the active mine depth from the active mineshaft', () => {
    const depth0 = makeDepth(0);
    const depth1 = makeDepth(1);

    const shaft = makeMineshaft({
      mineDepths: [depth0, depth1],
      activeDepthIndex: 1,
    });

    const plot = makePlot({
      mineshafts: [shaft],
      activeMineshaftIndex: 0,
    });

    expect(getActiveMineDepth(plot)).toBe(depth1);
  });

  it('returns null when there is no active mineshaft', () => {
    const plot = makePlot({
      mineshafts: [],
      activeMineshaftIndex: 0,
    });

    expect(getActiveMineDepth(plot)).toBeNull();
  });

  it('returns null when the active depth index is out of bounds', () => {
    const shaft = makeMineshaft({
      mineDepths: [makeDepth(0)],
      activeDepthIndex: 99,
    });

    const plot = makePlot({
      mineshafts: [shaft],
      activeMineshaftIndex: 0,
    });

    expect(getActiveMineDepth(plot)).toBeNull();
  });
});

describe('createScaffoldPlot', () => {
  it('is Tile-less and not built', () => {
    const plot = createScaffoldPlot('2,1');
    expect(plot.plotId).toBe('2,1');
    expect(plot.mineshafts).toHaveLength(1);
    expect(plot.mineshafts[0].mineDepths).toHaveLength(0);
    expect(plot.station).toBeNull();
    expect(isPlotBuilt(plot)).toBe(false);
  });
});

describe('getMineDepthByDepth', () => {
  it('returns the matching mine depth by depth number', () => {
    const depth0 = makeDepth(0);
    const depth2 = makeDepth(2);
    const shaft = makeMineshaft({
      mineDepths: [depth0, depth2],
    });

    expect(getMineDepthByDepth(shaft, 2)).toBe(depth2);
  });

  it('returns null when the depth does not exist', () => {
    const shaft = makeMineshaft({
      mineDepths: [makeDepth(0), makeDepth(1)],
    });

    expect(getMineDepthByDepth(shaft, 5)).toBeNull();
  });

  it('returns null when the mineshaft has no mine depths', () => {
    const shaft = makeMineshaft({
      mineDepths: [],
    });

    expect(getMineDepthByDepth(shaft, 0)).toBeNull();
  });
});
