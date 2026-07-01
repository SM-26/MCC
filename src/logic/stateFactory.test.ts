// src/logic/stateFactory.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./mine/mineGen', () => ({
  generatePlot: vi.fn(),
  buildPlot: vi.fn(),
}));

import { buildPlot } from './mine/mineGen';
import { isPlotBuilt } from './mine/mineTypes';
import { getInitialNavigationState, getInitialState } from './stateFactory';

const mockedBuildPlot = vi.mocked(buildPlot);

const mockSurfaceDepth = {
  depth: 0,
  rows: 2,
  cols: 2,
  tiles: [
    [
      { type: 'empty' as const, level: 1, hp: 0, maxHp: 0, value: 0, resourceType: 'none' as const },
      { type: 'empty' as const, level: 1, hp: 0, maxHp: 0, value: 0, resourceType: 'none' as const },
    ],
    [
      { type: 'empty' as const, level: 1, hp: 0, maxHp: 0, value: 0, resourceType: 'none' as const },
      { type: 'empty' as const, level: 1, hp: 0, maxHp: 0, value: 0, resourceType: 'none' as const },
    ],
  ],
  miners: [],
};

function makeMockPlotState() {
  return {
    currentAge: 'Mechanical' as const,
    ageResources: { coal: 0, oil: 0, copper: 0, superalloy: 0 },
    mineshafts: [
      {
        mineDepths: [mockSurfaceDepth],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: 0,
        activeDepthIndex: 0,
      },
    ],
    activeMineshaftIndex: 0,
    station: null,
  };
}

describe('stateFactory', () => {
  beforeEach(() => {
    mockedBuildPlot.mockReset();
    mockedBuildPlot.mockImplementation(() => makeMockPlotState());
  });

  describe('getInitialState', () => {
    it('returns the expected root state defaults', () => {
      const state = getInitialState();

      expect(state.money).toBe(75);

      expect(state.engineering).toEqual({
        engineeringIdeas: 0,
        resetCount: 0,
        maxNorthExpansions: 1,
        maxUndergroundLevels: 0,
      });

      expect(state.settings).toEqual({
        navbarPosition: 'top',
        defaultView: 'world',
        devMode: false,
        soundEnabled: false,
        notificationsEnabled: false,
        theme: 'system',
        userColor: '#14213d',
        worldSeed: '123456',
      });
    });

    it('seeds the home plot into world.plots at the ring-0 cell id', () => {
      const state = getInitialState();
      const { world } = state;

      expect(world.activePlotCellId).toBe('0,0');
      expect(world.plots['0,0']).toBeDefined();
      expect(isPlotBuilt(world.plots['0,0'])).toBe(true);
    });

    it('home plot has correct initial structure', () => {
      const state = getInitialState();
      const plot = state.world.plots['0,0'];

      expect(plot).toMatchObject({
        currentAge: 'Mechanical',
        ageResources: { coal: 0, oil: 0, copper: 0, superalloy: 0 },
        activeMineshaftIndex: 0,
        station: null,
      });
      expect(plot.mineshafts).toHaveLength(1);
    });

    it('creates one default mineshaft with one generated mine depth', () => {
      const state = getInitialState();
      const plot = state.world.plots['0,0'];

      expect(plot.mineshafts).toHaveLength(1);
      expect(plot.mineshafts[0]).toMatchObject({
        selectedMiner: null,
        draggedMiner: null,
        lastTick: 0,
        activeDepthIndex: 0,
      });

      expect(plot.mineshafts[0].mineDepths).toHaveLength(1);
      expect(plot.mineshafts[0].mineDepths[0]).toBe(mockSurfaceDepth);
    });

    it('has no top-level plots array', () => {
      const state = getInitialState();
      expect((state as unknown as Record<string, unknown>)['plots']).toBeUndefined();
    });

    it('calls buildPlot with the home cell id, world seed, and reset count', () => {
      getInitialState();

      expect(mockedBuildPlot).toHaveBeenCalledTimes(1);
      expect(mockedBuildPlot).toHaveBeenCalledWith('0,0', '123456', 0);
    });

    it('returns fresh state objects on each call', () => {
      const first = getInitialState();
      const second = getInitialState();

      first.money = 999;
      first.settings.worldSeed = 'changed';
      first.engineering.engineeringIdeas = 42;
      first.world.plots['0,0'].ageResources.coal = 10;

      expect(second.money).toBe(75);
      expect(second.settings.worldSeed).toBe('123456');
      expect(second.engineering.engineeringIdeas).toBe(0);
      expect(second.world.plots['0,0'].ageResources.coal).toBe(0);
    });

    it('does not share nested references between calls', () => {
      const first = getInitialState();
      const second = getInitialState();

      expect(first).not.toBe(second);
      expect(first.settings).not.toBe(second.settings);
      expect(first.engineering).not.toBe(second.engineering);
      expect(first.world).not.toBe(second.world);
      expect(first.world.plots).not.toBe(second.world.plots);
      expect(first.world.plots['0,0']).not.toBe(second.world.plots['0,0']);
      expect(first.world.plots['0,0'].mineshafts).not.toBe(second.world.plots['0,0'].mineshafts);
    });
  });

  describe('getInitialNavigationState', () => {
    it('returns the default saved navigation state', () => {
      expect(getInitialNavigationState()).toEqual({
        activeTab: 'world',
        tabs: ['world', 'mine', 'station', 'engineering', 'settings'],
        showLabels: true,
        showEmojis: true,
        showActiveLabel: true,
      });
    });

    it('returns a fresh navigation object on each call', () => {
      const first = getInitialNavigationState();
      const second = getInitialNavigationState();

      expect(first.activeTab).toBe('world');
      expect(second.activeTab).toBe('world');
      expect(first).not.toBe(second);
    });
  });
});
