// src/components/station/stationSelectors.ts
//
// Pure derivations the new Station UI reads. Deliberately free of any Svelte or
// store import so the dashboard counts and stepper bounds can be unit-tested
// against a plain fixture station.
//
// These live under components/ rather than logic/station/ on purpose: they are
// presentation questions ("what does this screen show?"), not game rules. The
// rules in logic/station/ are unchanged by the redesign.

import { getPlatformsForMineshaft } from '../../logic/station/stationTypes';
import { isExplorationRoute } from '../../logic/world/worldTypes';
import type { Platform, Station, Train } from '../../logic/station/stationTypes';

export interface StationSummary {
  idle: number;
  enRoute: number;
  empty: number;
}

/**
 * The dashboard's three stats. A platform is in exactly one bucket: no train at
 * all is `empty`, a train mid-trip is `enRoute`, anything else is `idle`.
 */
export function getStationSummary(station: Station | null): StationSummary {
  const summary: StationSummary = { idle: 0, enRoute: 0, empty: 0 };

  for (const platform of station?.platforms ?? []) {
    if (!platform.train) {
      summary.empty += 1;
    } else if (platform.train.trip) {
      summary.enRoute += 1;
    } else {
      summary.idle += 1;
    }
  }

  return summary;
}

/**
 * Platforms "Dispatch ready" will act on: a train that has somewhere to go and
 * isn't already going there. Matches the per-train guard inside `dispatch()`,
 * so the count on the button can't promise more than the action delivers.
 *
 * `exploreTargetFree` is that same honesty rule applied to scouts: an
 * exploration route only leads somewhere while a hidden tile is inspected and
 * nobody is already headed for it. And since there is exactly one such tile,
 * at most one scout can count, otherwise the button would promise N trips and
 * deliver one.
 */
export function getDispatchReadyPlatforms(station: Station | null, options: { exploreTargetFree?: boolean } = {}): Platform[] {
  const ready: Platform[] = [];
  let scoutClaimed = false;

  for (const platform of station?.platforms ?? []) {
    const train = platform.train;
    if (!train || !train.route || train.trip) {
      continue;
    }

    if (isExplorationRoute(train.route)) {
      if (!options.exploreTargetFree || scoutClaimed) {
        continue;
      }
      scoutClaimed = true;
    }

    ready.push(platform);
  }

  return ready;
}

/** True when this train could be dispatched right now, drives the Ready pill. */
export function isDispatchable(train: Train | null, exploreTargetFree: boolean): boolean {
  if (!train || !train.route || train.trip) {
    return false;
  }
  return isExplorationRoute(train.route) ? exploreTargetFree : true;
}

/** Ascending shaft indexes that actually have a platform, the stepper's range. */
export function getShaftIndexesWithPlatforms(station: Station | null): number[] {
  const indexes = new Set((station?.platforms ?? []).map((platform) => platform.mineshaftIndex));
  return [...indexes].sort((a, b) => a - b);
}

/**
 * Neighbouring platforms within the same shaft, by depth. `shallower` is what
 * the ▲ step targets, `deeper` the ▼, null at either end so the button
 * disables rather than wrapping around.
 */
export function getPlatformNeighbours(station: Station | null, platform: Platform | null): { shallower: Platform | null; deeper: Platform | null } {
  if (!station || !platform) {
    return { shallower: null, deeper: null };
  }

  const ordered = getPlatformsForMineshaft(station, platform.mineshaftIndex);
  const index = ordered.findIndex((candidate) => candidate.id === platform.id);
  if (index === -1) {
    return { shallower: null, deeper: null };
  }

  return {
    shallower: ordered[index - 1] ?? null,
    deeper: ordered[index + 1] ?? null,
  };
}

/**
 * Stepping to another shaft lands on its shallowest platform, the shaft's own
 * depth ordering is what `getPlatformsForMineshaft` already guarantees.
 */
export function getShallowestPlatform(station: Station | null, mineshaftIndex: number): Platform | null {
  if (!station) {
    return null;
  }
  return getPlatformsForMineshaft(station, mineshaftIndex)[0] ?? null;
}

/** `m:ss` for a countdown, floored at 0:00 so a late tick never shows negatives. */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
