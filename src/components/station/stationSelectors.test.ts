// src/components/station/stationSelectors.test.ts
import { describe, it, expect } from 'vitest';
import { createEmptyStation, createPlatform, createTrain } from '../../logic/station/stationTypes';
import type { Platform, Station, Train } from '../../logic/station/stationTypes';
import {
  formatCountdown,
  getDispatchReadyPlatforms,
  getPlatformNeighbours,
  getShaftIndexesWithPlatforms,
  getShallowestPlatform,
  getStationSummary,
  isDispatchable,
} from './stationSelectors';

function withRoute(train: Train): Train {
  train.route = { destinationId: 'city-1', destinationType: 'city' };
  return train;
}

function withTrip(train: Train): Train {
  train.trip = { kind: 'route', targetCellId: 'city-1', departedAt: 0, durationMs: 10_000, cargo: {} };
  return train;
}

/** One platform of each state: idle-with-route, travelling, and empty. */
function makeStation(): Station {
  const station = createEmptyStation('station-0,0');

  const ready = createPlatform('p-ready', 0, 0);
  ready.train = withRoute(createTrain('t-ready', 'Steam'));

  const out = createPlatform('p-out', 0, 6);
  out.train = withTrip(withRoute(createTrain('t-out', 'Diesel')));

  const empty = createPlatform('p-empty', 1, 0);

  station.platforms = [ready, out, empty];
  return station;
}

describe('getStationSummary', () => {
  it('buckets one of each state', () => {
    expect(getStationSummary(makeStation())).toEqual({ idle: 1, enRoute: 1, empty: 1 });
  });

  it('counts a train with no route as idle, not empty', () => {
    const station = createEmptyStation('s');
    const platform = createPlatform('p', 0, 0);
    platform.train = createTrain('t', 'Steam');
    station.platforms = [platform];

    expect(getStationSummary(station)).toEqual({ idle: 1, enRoute: 0, empty: 0 });
  });

  it('is all zeroes without a station', () => {
    expect(getStationSummary(null)).toEqual({ idle: 0, enRoute: 0, empty: 0 });
  });
});

describe('getDispatchReadyPlatforms', () => {
  it('picks exactly the platforms with a route and no trip', () => {
    const ready = getDispatchReadyPlatforms(makeStation());
    expect(ready.map((p) => p.id)).toEqual(['p-ready']);
  });

  it('ignores a train that has no route', () => {
    const station = createEmptyStation('s');
    const platform = createPlatform('p', 0, 0);
    platform.train = createTrain('t', 'Steam');
    station.platforms = [platform];

    expect(getDispatchReadyPlatforms(station)).toEqual([]);
  });
});

describe('getDispatchReadyPlatforms with scouts', () => {
  /** Station with `count` idle trains, all on exploration duty. */
  function makeScoutStation(count: number): Station {
    const station = createEmptyStation('s');
    station.platforms = Array.from({ length: count }, (_, index) => {
      const platform = createPlatform(`scout-${index}`, 0, index * 6);
      const train = createTrain(`t-${index}`, 'Steam');
      train.route = { destinationId: 'exploration', destinationType: 'exploration' };
      platform.train = train;
      return platform;
    });
    return station;
  }

  it('does not count a scout when no hidden tile is inspected', () => {
    const station = makeScoutStation(1);
    expect(getDispatchReadyPlatforms(station, { exploreTargetFree: false })).toEqual([]);
    expect(isDispatchable(station.platforms[0].train, false)).toBe(false);
  });

  it('counts a scout once a hidden tile is available', () => {
    const station = makeScoutStation(1);
    expect(getDispatchReadyPlatforms(station, { exploreTargetFree: true }).map((p) => p.id)).toEqual(['scout-0']);
    expect(isDispatchable(station.platforms[0].train, true)).toBe(true);
  });

  it('counts only one scout, since there is only ever one inspected tile', () => {
    const station = makeScoutStation(3);
    expect(getDispatchReadyPlatforms(station, { exploreTargetFree: true }).map((p) => p.id)).toEqual(['scout-0']);
  });

  it('still counts non-scouts while scouts are grounded', () => {
    const station = makeScoutStation(1);
    const hauler = createPlatform('hauler', 0, 11);
    hauler.train = withRoute(createTrain('t-haul', 'Diesel'));
    station.platforms.push(hauler);

    expect(getDispatchReadyPlatforms(station, { exploreTargetFree: false }).map((p) => p.id)).toEqual(['hauler']);
  });
});

describe('getShaftIndexesWithPlatforms', () => {
  it('returns ascending unique shafts that actually have a platform', () => {
    expect(getShaftIndexesWithPlatforms(makeStation())).toEqual([0, 1]);
  });

  it('is empty without a station', () => {
    expect(getShaftIndexesWithPlatforms(null)).toEqual([]);
  });
});

describe('getPlatformNeighbours', () => {
  const station = makeStation();
  const byId = (id: string) => station.platforms.find((p) => p.id === id) as Platform;

  it('has no shallower neighbour at the top of a shaft', () => {
    const { shallower, deeper } = getPlatformNeighbours(station, byId('p-ready'));
    expect(shallower).toBeNull();
    expect(deeper?.id).toBe('p-out');
  });

  it('has no deeper neighbour at the bottom of a shaft', () => {
    const { shallower, deeper } = getPlatformNeighbours(station, byId('p-out'));
    expect(shallower?.id).toBe('p-ready');
    expect(deeper).toBeNull();
  });

  it('does not step across shafts', () => {
    const { shallower, deeper } = getPlatformNeighbours(station, byId('p-empty'));
    expect(shallower).toBeNull();
    expect(deeper).toBeNull();
  });
});

describe('getShallowestPlatform', () => {
  it('is what a shaft step lands on', () => {
    expect(getShallowestPlatform(makeStation(), 0)?.id).toBe('p-ready');
    expect(getShallowestPlatform(makeStation(), 1)?.id).toBe('p-empty');
  });

  it('is null for a shaft with no platforms', () => {
    expect(getShallowestPlatform(makeStation(), 9)).toBeNull();
  });
});

describe('formatCountdown', () => {
  it('formats m:ss with a padded seconds field', () => {
    expect(formatCountdown(61_000)).toBe('1:01');
    expect(formatCountdown(9_000)).toBe('0:09');
  });

  it('floors at 0:00 so a late tick never shows a negative', () => {
    expect(formatCountdown(-5_000)).toBe('0:00');
  });
});
