// src/logic/save/saveTypes.ts

import type { GameSessionState } from '../app/gameState.svelte';
import type { NavigationState } from '../app/navigationTypes';
import type { EngineeringState } from '../engineering/engineeringTypes';
import type { WorldState } from '../world/worldTypes';

export interface GameState extends GameSessionState {
  world: WorldState; // world.plots holds the developed-plot map
  engineering: EngineeringState;
}

export interface PersistedGameState extends GameState {
  navigation: NavigationState;
}

export interface SaveMetadata {
  saveVersion: string;
  saveCommitHash: string;
  savedAt: number;
}

export type SavedNavigation = NavigationState;

export interface SaveFile {
  meta: SaveMetadata;
  data: PersistedGameState;
}
