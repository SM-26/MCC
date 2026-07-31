// src/components/station/stationHelpers.svelte.ts
//
// View glue shared by the Station parts. These were local functions inside the
// old single-file StationView; the redesign splits that file into eight
// components which all still need them, so they moved here rather than being
// prop-drilled four levels deep.
//
// Kept apart from stationSelectors.ts because these touch stores and the toast,
// while the selectors stay pure and unit-testable.

import { debouncedSave } from '../../logic/save/save.svelte';
import { gameState } from '../../logic/app/gameState.svelte';
import { worldStore } from '../../logic/world/worldStore.svelte';
import { getCellById } from '../../logic/world/worldTypes';
import { getCartCapacity } from '../../logic/station/stationTypes';
import { getTravelEta } from '../../logic/station/stationActions';
import { getCargoSaleValue, getCityPayout, planCargoLoad } from '../../logic/station/stationBalance';
import { triggerMobileToast } from '../GameTooltip.svelte';
import type { BuildResult } from '../../logic/station/stationActions';
import type { Train } from '../../logic/station/stationTypes';
import type { AgeResources, PlotState } from '../../logic/mine/mineTypes';

/**
 * Commit an action result: toast the reason on failure, otherwise apply any
 * money change and save. Centralising `nextMoney` matters — a caller that
 * forgets to apply it is exactly how buying a shaft became a money sink.
 */
export function commit(result: BuildResult): boolean {
  if (!result.ok) {
    if (result.message) {
      triggerMobileToast(result.message);
    }
    return false;
  }
  if (typeof result.nextMoney === 'number') {
    gameState.current.money = result.nextMoney;
  }
  debouncedSave();
  return true;
}

export function lacksResources(required: Partial<AgeResources>, available: AgeResources): boolean {
  return (Object.entries(required) as [keyof AgeResources, number][]).some(([resource, amount]) => available[resource] < amount);
}

/** "need $150, 15 coal" for the shortfall on a cost, or '' when affordable. */
export function missingLabel(cost: { money: number; resources: Partial<AgeResources> }, available: AgeResources | undefined): string {
  const money = gameState.current.money;
  const parts: string[] = [];

  if (money < cost.money) {
    parts.push(`$${cost.money - money}`);
  }
  if (available) {
    for (const [resource, amount] of Object.entries(cost.resources) as [keyof AgeResources, number][]) {
      if (available[resource] < amount) {
        parts.push(`${amount - available[resource]} ${resource}`);
      }
    }
  }

  return parts.length ? `need ${parts.join(', ')}` : '';
}

export interface TripPreview {
  etaSec: number | null;
  reward: string;
}

/** Live "what dispatch will do" for the current route — recomputes as carts/resources change, locks in on dispatch. */
export function tripPreview(train: Train, plot: PlotState | null, plotCellId: string | null): TripPreview | null {
  const destId = train.route?.destinationId;
  if (!destId || !plotCellId) {
    return null;
  }

  const cell = getCellById(worldStore.current, destId);
  if (!cell) {
    return null;
  }

  const etaMs = getTravelEta(train, plotCellId, destId);
  const etaSec = etaMs !== null ? Math.ceil(etaMs / 1000) : null;

  if (cell.type === 'city') {
    return { etaSec, reward: `$${getCityPayout(cell.ring, train.carts)}` };
  }

  const cargo = plot ? planCargoLoad(getCartCapacity(train, 'cargo'), plot.ageResources) : {};
  const units = Object.values(cargo).reduce((sum, n) => sum + (n ?? 0), 0);

  if (cell.type === 'factory') {
    return { etaSec, reward: `$${getCargoSaleValue(cargo)} (${units} cargo)` };
  }
  return { etaSec, reward: `delivers ${units} cargo` };
}

/** Planned cargo units for the current route — drives the crates on the deck. */
export function plannedCargoUnits(train: Train, plot: PlotState | null): number {
  if (!plot) {
    return 0;
  }
  const cargo = planCargoLoad(getCartCapacity(train, 'cargo'), plot.ageResources);
  return Object.values(cargo).reduce((sum, n) => sum + (n ?? 0), 0);
}
