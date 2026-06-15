// src/logic/stateFactory.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./mine/mineGen', () => ({
  generatePlot: vi.fn(),
}));

import { generatePlot } from './mine/mineGen';
import { getInitialNavigationState, getInitialState } from './stateFactory';

const mockedGeneratePlot = vi.mocked(generatePlot);

describe('stateFactory', () => {
  beforeEach(() => {
    mockedGeneratePlot.mockReset();
    mockedGeneratePlot.mockReturnValue({
      depth: 0,
      rows: 2,
      cols: 2,
      tiles: [
        [
          {
            type: 'empty',
            level: 1,
            hp: 0,
            maxHp: 0,
            value: 0,
            resourceType: 'none',
          },
          {
            type: 'empty',
            level: 1,
            hp: 0,
            maxHp: 0,
            value: 0,
            resourceType: 'none',
          },
        ],
        [
          {
            type: 'empty',
            level: 1,
            hp: 0,
            maxHp: 0,
            value: 0,
            resourceType: 'none',
          },
          {
            type: 'empty',
            level: 1,
            hp: 0,
            maxHp: 0,
            value: 0,
            resourceType: 'none',
          },
        ],
      ],
      miners: [],
    });
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
        notificationsEnabled: true,
        theme: 'dark',
        worldSeed: '123456',
      });
    });

    it('creates the default first plot', () => {
      const state = getInitialState();

      expect(state.plots).toHaveLength(1);
      expect(state.plots[0]).toMatchObject({
        plotId: 'plot-0',
        plotName: 'Prague',
        currentAge: 'Mechanical',
        ageResources: {
          coal: 0,
          oil: 0,
          copper: 0,
          superalloy: 0,
        },
        activeNorthExpansionIndex: 0,
        station: null,
      });
    });

    it('creates one default north expansion with one generated mine depth', () => {
      const state = getInitialState();
      const plot = state.plots[0];

      expect(plot.northExpansions).toHaveLength(1);
      expect(plot.northExpansions[0]).toMatchObject({
        selectedMiner: null,
        draggedMiner: null,
        lastTick: 0,
        activeDepthIndex: 0,
      });

      expect(plot.northExpansions[0].mineDepths).toHaveLength(1);
      expect(plot.northExpansions[0].mineDepths[0]).toEqual(mockedGeneratePlot.mock.results[0]?.value);
    });

    it('builds world plot references from the initial plots', () => {
      const state = getInitialState();

      expect(state.world).toEqual({
        cells: [],
        plots: [
          {
            plotId: 'plot-0',
            cellId: 'cell-plot-0',
            plotName: 'Prague',
            discovered: true,
          },
        ],
        activePlotIndex: 0,
      });
    });

    it('calls generatePlot with the expected seed, depth, and plot index', () => {
      getInitialState();

      expect(mockedGeneratePlot).toHaveBeenCalledTimes(1);
      expect(mockedGeneratePlot).toHaveBeenCalledWith('123456', 0, 0);
    });

    it('returns fresh state objects on each call', () => {
      const first = getInitialState();
      const second = getInitialState();

      first.money = 999;
      first.settings.worldSeed = 'changed';
      first.engineering.engineeringIdeas = 42;
      first.plots[0].plotName = 'Changed Plot';
      first.plots[0].ageResources.coal = 10;
      first.world.plots[0].plotName = 'Changed World Plot';

      expect(second.money).toBe(75);
      expect(second.settings.worldSeed).toBe('123456');
      expect(second.engineering.engineeringIdeas).toBe(0);
      expect(second.plots[0].plotName).toBe('Prague');
      expect(second.plots[0].ageResources.coal).toBe(0);
      expect(second.world.plots[0].plotName).toBe('Prague');
    });

    it('does not share nested references between calls', () => {
      const first = getInitialState();
      const second = getInitialState();

      expect(first).not.toBe(second);
      expect(first.settings).not.toBe(second.settings);
      expect(first.engineering).not.toBe(second.engineering);
      expect(first.plots).not.toBe(second.plots);
      expect(first.plots[0]).not.toBe(second.plots[0]);
      expect(first.plots[0].northExpansions).not.toBe(second.plots[0].northExpansions);
      expect(first.world).not.toBe(second.world);
      expect(first.world.plots).not.toBe(second.world.plots);
    });
  });

  describe('getInitialNavigationState', () => {
    it('returns the default saved navigation state', () => {
      expect(getInitialNavigationState()).toEqual({
        activeTab: 'world',
      });
    });

    it('returns a fresh navigation object on each call', () => {
      const first = getInitialNavigationState();
      const second = getInitialNavigationState();

      expect(first).toEqual({ activeTab: 'world' });
      expect(second).toEqual({ activeTab: 'world' });
      expect(first).not.toBe(second);
    });
  });
});
