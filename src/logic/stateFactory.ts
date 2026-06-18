// src/logic/stateFactory.ts

import { createDefaultNavigationState } from './app/navigationTypes';
import { createDefaultSettingsState } from './app/settingsTypes';
import type { GameState } from './save/saveTypes';
import { generatePlot } from './mine/mineGen';
import { generateWorld } from './world/worldGen';

export function getInitialState(): GameState {
  const worldSeed = '123456';
  const resetCount = 0;
  const world = generateWorld(worldSeed, resetCount, 1);
  const plotCell = world.cells.find((cell) => cell.type === 'plot' && cell.ring === 0);
  const plotId = plotCell ? `plot-${plotCell.id}` : 'plot-0';

  return {
    money: 75,
    world,
    plots: [
      {
        plotId,
        currentAge: 'Mechanical',
        ageResources: {
          coal: 0,
          oil: 0,
          copper: 0,
          superalloy: 0,
        },
        northExpansions: [
          {
            mineDepths: [generatePlot(worldSeed, resetCount, 0, 0)],
            selectedMiner: null,
            draggedMiner: null,
            lastTick: 0,
            activeDepthIndex: 0,
          },
        ],
        activeNorthExpansionIndex: 0,
        station: null,
      },
    ],
    engineering: {
      engineeringIdeas: 0,
      resetCount: 0,
      maxNorthExpansions: 1,
      maxUndergroundLevels: 0,
    },
    settings: {
      ...createDefaultSettingsState(),
      worldSeed,
    },
  };
}

export function getInitialNavigationState() {
  return createDefaultNavigationState();
}
