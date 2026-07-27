// src/logic/mine/ageProgression.ts
//
// The age ladder: ordering, the resource each age runs on, what the next step
// costs, and how deep an age lets you dig. Age is a plot concept, so this lives
// under mine/ — station code imports it, not the other way round.

import { log } from '../../lib/logger';
import { gameState } from '../app/gameState.svelte';
import type { ActionResult } from './mineActions';
import type { AgeResources, Ages, PlotState } from './mineTypes';

export const AGE_ORDER: Ages[] = ['Mechanical', 'Steam', 'Diesel', 'Electric', 'Maglev'];

export function isAgeAtLeast(current: Ages, required: Ages): boolean {
  return AGE_ORDER.indexOf(current) >= AGE_ORDER.indexOf(required);
}

/** The signature resource of each age (what its tech "runs on"). */
export const AGE_RESOURCE: Record<Ages, keyof AgeResources | null> = {
  Mechanical: null,
  Steam: 'coal',
  Diesel: 'oil',
  Electric: 'copper',
  Maglev: 'superalloy',
};

/** The age one step up, or null at the top of the ladder. */
export function getNextAge(age: Ages): Ages | null {
  return AGE_ORDER[AGE_ORDER.indexOf(age) + 1] ?? null;
}

/**
 * Cost to advance *into* each age. Keyed by the target, so `Mechanical` — the
 * starting age, never a target — is free.
 * ponytail: flat table, measured against ~60 ore per bracket per shaft. If
 * bracket yield ever drops toward 50, lower these or raise the shaft cap.
 */
export const AGE_ADVANCE_COST: Record<Ages, { money: number; resources: Partial<AgeResources> }> = {
  Mechanical: { money: 0, resources: {} },
  Steam: { money: 250, resources: { coal: 50 } },
  Diesel: { money: 750, resources: { oil: 50 } },
  Electric: { money: 2000, resources: { copper: 50 } },
  Maglev: { money: 5000, resources: { superalloy: 50 } },
};

/**
 * Deepest depth an age may dig to: the end of the ore bracket that funds the
 * next age (mineGen brackets are 5 depths wide). Maglev is uncapped.
 */
export function getMaxDepthForAge(age: Ages): number {
  const index = AGE_ORDER.indexOf(age);
  return index === AGE_ORDER.length - 1 ? Number.POSITIVE_INFINITY : 9 + 5 * index;
}

/**
 * Advance the plot one age, charging money + ore.
 *
 * The depth cap is a *ceiling*, never a prerequisite: `ageResources` pools
 * across every shaft, so a second shaft's depth 0-9 funds an age without ever
 * digging past the cap. Do not gate this on a depth.
 *
 * Money is spent here, not handed back as `nextMoney` — `spendMoney` is the
 * commit point, so every check that can fail runs before it.
 */
export function advanceAge(plot: PlotState): ActionResult {
  const nextAge = getNextAge(plot.currentAge);
  if (!nextAge) {
    return { ok: false, message: 'Already at the final age' };
  }

  const cost = AGE_ADVANCE_COST[nextAge];
  if (gameState.current.money < cost.money) {
    return { ok: false, message: 'Not enough money to advance!' };
  }

  const shortfall = (Object.entries(cost.resources) as [keyof AgeResources, number][]).filter(([resource, amount]) => plot.ageResources[resource] < amount);
  if (shortfall.length > 0) {
    return { ok: false, message: 'Not enough resources to advance!' };
  }

  if (!gameState.spendMoney(cost.money)) {
    return { ok: false, message: 'Not enough money to advance!' };
  }

  for (const [resource, amount] of Object.entries(cost.resources) as [keyof AgeResources, number][]) {
    plot.ageResources[resource] -= amount;
  }
  plot.currentAge = nextAge;
  log.info('ageProgression', `advanced to ${nextAge}`);

  return { ok: true };
}
