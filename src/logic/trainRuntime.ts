// src/logic/trainRuntime.ts
//
// App-level composition point for the train system (like stateFactory.ts):
// the only place station logic meets the live stores. Does NOT save —
// callers own persistence, which keeps this file import-cycle-free
// (save.svelte.ts imports this for offline catch-up on load).

import { gameState } from './app/gameState.svelte';
import { engineeringStore } from './engineering/engineeringStore.svelte';
import { plotsStore } from './mine/plotsStore.svelte';
import { worldStore } from './world/worldStore.svelte';
import { revealTouchingFrontier } from './world/worldGen';
import { processTrains } from './station/trainTick';

/** Complete all due trips. Returns true if anything completed (caller should save). */
export function runTrainCompletion(now: number = Date.now()): boolean {
  const result = processTrains(plotsStore.current, worldStore.current, gameState.current.money, now);
  if (result.completedTrips > 0) {
    gameState.setMoney(result.nextMoney);
    revealTouchingFrontier(worldStore.current, gameState.current.settings.worldSeed, engineeringStore.current.resetCount);
  }
  return result.completedTrips > 0;
}
