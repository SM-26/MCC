// src/logic/stateFactory.ts

import { createDefaultNavigationState } from './app/navigationTypes';
import { createDefaultSettingsState } from './app/settingsTypes';
import type { GameState } from './save/saveTypes';
import { buildPlot } from './mine/mineGen';
import { generateWorld } from './world/worldGen';

export function getInitialState(): GameState {
  const worldSeed = '123456';
  const resetCount = 0;
  const world = generateWorld(worldSeed, resetCount, 1);
  const homeCellId = world.activePlotCellId ?? '0,0';
  world.plots = { [homeCellId]: buildPlot(homeCellId, worldSeed, resetCount) };
  return {
    money: 75,
    world,
    engineering: { engineeringIdeas: 0, resetCount: 0, maxNorthExpansions: 1, maxUndergroundLevels: 0 },
    settings: { ...createDefaultSettingsState(), worldSeed },
  };
}

export function getInitialNavigationState() {
  return createDefaultNavigationState();
}
