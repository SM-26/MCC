// src/logic/mineRuntime.ts
//
// App-level composition point for mining, mirroring trainRuntime.ts: the only
// place mine logic meets the live stores. Does NOT save, the caller owns
// persistence.
//
// This exists because mining used to be driven from MineView against whichever
// depth happened to be on screen, so a second shaft (and every plot you weren't
// looking at) silently produced nothing. Miners are placed per depth and belong
// to the plot, not to the view, so the tick belongs here.

import { gameState } from './app/gameState.svelte';
import { plotsStore } from './mine/plotsStore.svelte';
import { runMiningTick } from './mine/mineTick';
import type { AgeResources } from './mine/mineTypes';

/** `changed` means the caller should save. */
export function runMiningForAllPlots(): { changed: boolean } {
  let money = gameState.current.money;
  let changed = false;

  for (const plot of Object.values(plotsStore.current)) {
    for (const mineshaft of plot.mineshafts) {
      for (const depth of mineshaft.mineDepths) {
        // Depths without miners can't produce anything; skip before doing the
        // neighbour scan, since this runs across every plot every second.
        if (depth.miners.length === 0) {
          continue;
        }

        const result = runMiningTick(depth, money);
        money = result.nextMoney;

        for (const [resource, amount] of Object.entries(result.resourcesEarned) as [keyof AgeResources, number][]) {
          // Ore pools on the plot, never on the mineshaft, every shaft of a
          // plot feeds the same bucket.
          plot.ageResources[resource] += amount;
          changed = true;
        }

        if (result.didClearTile || result.didEarnMoney) {
          changed = true;
        }
      }
    }
  }

  if (money !== gameState.current.money) {
    gameState.setMoney(money);
  }

  return { changed };
}
