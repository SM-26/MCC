// src/logic/stateFactory.ts

import type { GameState } from './save/saveTypes';
import type { PlotState } from './mine/mineTypes';
import type { WorldState } from './world/worldTypes';

import { createDefaultEngineeringState } from './engineering/engineeringTypes';
import { createDefaultSavedNavigation } from './app/navigationTypes';
import { createDefaultSettingsState } from './app/settingsTypes';
import { createEmptyAgeResources } from './mine/mineTypes';
import { engineeringStore } from './engineering/engineeringStore.svelte';
import { generatePlot } from './mine/mineGen';
import { generateWorld } from './world/worldGen';


function createDefaultPlotState(worldSeed: string, plotIndex = 0, plotId = `plot-${plotIndex}`, plotName = 'Prague'): PlotState {
  return {
    plotId,
    plotName,
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    northExpansions: [
      {
        mineDepths: [generatePlot(worldSeed, engineeringStore.current.resetCount, 0, plotIndex)],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: 0,
        activeDepthIndex: 0,
      },
    ],
    activeNorthExpansionIndex: 0,
    station: null,
  };
}

function createDefaultWorldState(worldSeed: string, resetCount: number): WorldState {
  return generateWorld(worldSeed, resetCount, 1);
}

/**
 * Returns a fresh deep copy of the base game configuration.
 * Used for both complete resets and as the structural base for save hydration.
 */
export function getInitialState(): GameState {
  const worldSeed = '123456';
  const resetCount = 0;

  const plots: PlotState[] = [createDefaultPlotState(worldSeed, 0, 'plot-0', 'Prague')];

  return {
    money: 75,
    world: createDefaultWorldState(worldSeed, resetCount),
    plots,
    engineering: {
      ...createDefaultEngineeringState(),
      maxNorthExpansions: 1,
    },
    settings: {
      ...createDefaultSettingsState(),
      navbarPosition: 'top',
      soundEnabled: false,
      theme: 'dark',
      worldSeed,
    },
  };
}

/**
 * Builds the default persisted navigation fragment.
 * Useful when assembling a full persisted save object.
 */
export function getInitialNavigationState() {
  return createDefaultSavedNavigation();
}
