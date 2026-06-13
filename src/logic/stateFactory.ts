// src/logic/stateFactory.ts
import type { GameState, NorthExpansion, PlotState } from '../types';
import { generatePlot } from './mineGen';

/**
 * Creates a default north expansion for a plot.
 */
function createDefaultNorthExpansion(worldSeed: string, plotIndex = 0): NorthExpansion {
  return {
    mineDepths: [generatePlot(worldSeed, 0, plotIndex)],
    selectedMiner: null,
    draggedMiner: null,
    lastTick: 0,
    activeDepthIndex: 0,
  };
}

/**
 * Creates a default player plot.
 */
function createDefaultPlotState(worldSeed: string, plotIndex = 0, plotName = 'Prague'): PlotState {
  return {
    plotName,
    northExpansions: [createDefaultNorthExpansion(worldSeed, plotIndex)],
    activeNorthExpansionIndex: 0,
    ageResources: {
      coal: 0,
      oil: 0,
      copper: 0,
      superAlloy: 0,
    },
    currentAge: 'Mechanical',
    station: null,
  };
}

/**
 * Returns a fresh deep copy of the base game configuration.
 * Used for both structural merging during loads and complete data resets.
 */
export function getInitialState(): GameState {
  const worldSeed = '123456';

  return {
    money: 75,
    world: {
      cells: [],
      plots: [createDefaultPlotState(worldSeed, 0, 'Prague')],
      activePlotIndex: 0,
    },
    meta: {
      engineeringIdeas: 0,
      resetCount: 0,
      maxNorthExpansions: 1,
      maxUndergroundLevels: 0,
    },
    settings: {
      navbarPosition: 'top',
      defaultView: 'world',
      devMode: false,
      soundEnabled: false,
      notificationsEnabled: true,
      theme: 'dark',
      worldSeed,
    },
  };
}
