// src/logic/stateFactory.ts

import { createDefaultNavigationState } from './app/navigationTypes';
import { createDefaultSettingsState } from './app/settingsTypes';
import type { GameState, PersistedGameState } from './save/saveTypes';
import { generateWorld } from './world/worldGen';

export function getInitialState(): GameState {
  return {
    money: 75,
    world: generateWorld('123456', 0, 1),
    plots: [],
    engineering: {
      resetCount: 0,
    } as PersistedGameState['engineering'],
    settings: createDefaultSettingsState(),
  } as GameState;
}

export function getInitialNavigationState() {
  return createDefaultNavigationState();
}
