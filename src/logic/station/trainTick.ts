// src/logic/station/trainTick.ts
//
// Trip completion for every train in the game. Pure over plain state: the
// caller (src/logic/trainRuntime.ts) passes the live store objects in and
// commits the returned money. Because trips carry absolute timestamps, this
// same function IS the offline catch-up when called once after load.

import { log } from '../../lib/logger';
import { createScaffoldPlot } from '../mine/mineTypes';
import type { AgeResources, PlotState } from '../mine/mineTypes';
import { getCellById } from '../world/worldTypes';
import type { WorldCellId, WorldState } from '../world/worldTypes';
import { getCargoSaleValue, getCityPayout } from './stationBalance';
import type { Train } from './stationTypes';

export interface TrainCompletionResult {
  nextMoney: number;
  completedTrips: number;
}

function depositCargo(target: AgeResources, cargo: Partial<AgeResources>): void {
  for (const [resource, amount] of Object.entries(cargo) as [keyof AgeResources, number][]) {
    target[resource] += amount;
  }
}

function resolveTrip(train: Train, plots: Record<WorldCellId, PlotState>, world: WorldState, money: number): number {
  const trip = train.trip!;
  const cell = getCellById(world, trip.targetCellId);

  if (trip.kind === 'explore') {
    if (cell && !cell.discovered) {
      cell.discovered = true;
      log.info('trains', `explored ${trip.targetCellId}: ${cell.type}`);
    }
    return money;
  }

  if (!cell) {
    log.warn('trains', `trip target ${trip.targetCellId} no longer exists; cargo lost`);
    return money;
  }

  switch (cell.type) {
    case 'city': {
      const payout = getCityPayout(cell.ring, train.carts);
      log.info('trains', `${train.id} returned from ${cell.name}: +${payout}`);
      return money + payout;
    }
    case 'factory': {
      const payout = getCargoSaleValue(trip.cargo);
      log.info('trains', `${train.id} sold cargo at ${cell.name}: +${payout}`);
      return money + payout;
    }
    case 'plot': {
      // Direct insert, not plotsStore.set — station logic can't import stores; Svelte 5 deep-wraps assigned values, so the inserted plot is reactive.
      const target = (plots[trip.targetCellId] ??= createScaffoldPlot(trip.targetCellId));
      depositCargo(target.ageResources, trip.cargo);
      log.info('trains', `${train.id} delivered cargo to ${cell.name}`);
      return money;
    }
    default:
      log.warn('trains', `trip target ${trip.targetCellId} is not a destination; cargo lost`);
      return money;
  }
}

/** Complete every due trip across all plots. Mutates state in place; returns money. */
export function processTrains(plots: Record<WorldCellId, PlotState>, world: WorldState, money: number, now: number): TrainCompletionResult {
  let nextMoney = money;
  let completedTrips = 0;

  for (const plot of Object.values(plots)) {
    for (const platform of plot.station?.platforms ?? []) {
      const train = platform.train;
      const trip = train?.trip;
      if (!train || !trip) {
        continue;
      }

      // Clock moved backwards (user clock change): restart the clock, keep the trip.
      if (trip.departedAt > now) {
        trip.departedAt = now;
        continue;
      }

      if (trip.departedAt + trip.durationMs > now) {
        continue;
      }

      nextMoney = resolveTrip(train, plots, world, nextMoney);
      train.trip = null;
      completedTrips += 1;
    }
  }

  return { nextMoney, completedTrips };
}
