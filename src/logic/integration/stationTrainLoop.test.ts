// src/logic/integration/stationTrainLoop.test.ts
//
// Full station loop over pure logic: build station → buy engine/carts →
// assemble → assign route → dispatch → complete → payout. Plus the offline
// catch-up scenario (trip completes in a single late processTrains call,
// exactly what loadGame does).

import { describe, it, expect } from 'vitest';
import { makeTestPlot } from '../station/stationActions.test';
import {
  addCart,
  assignRoute,
  buildStation,
  buyCart,
  buyEngine,
  dispatch,
  dispatchExplore,
  placeEngine,
} from '../station/stationActions';
import { getCityPayout, getTripDuration } from '../station/stationBalance';
import { processTrains } from '../station/trainTick';
import type { WorldCell, WorldState } from '../world/worldTypes';

function makeCell(id: string, type: WorldCell['type'], discovered = true): WorldCell {
  const [q, r] = id.split(',').map(Number);
  return { id, name: id, type, q, r, ring: Math.max(Math.abs(q), Math.abs(r)), discovered };
}

describe('station train loop', () => {
  it('runs the full loop: build → buy → assemble → route → dispatch → payout', () => {
    const plot = makeTestPlot([0]);
    const world: WorldState = {
      cells: [makeCell('0,0', 'plot'), makeCell('2,0', 'city'), makeCell('0,3', 'city', false)],
      plots: {},
      activePlotCellId: '0,0',
      inspectedCellId: null,
    };
    let money = 1000;

    // Build the station (foundation platform included).
    const built = buildStation(plot, money, '0,0');
    expect(built.ok).toBe(true);
    money = built.nextMoney!;
    const station = plot.station!;
    const platform = station.platforms[0];

    // Buy and assemble.
    const engine = buyEngine(station, plot, 'Mechanical', money);
    expect(engine.ok).toBe(true);
    money = engine.nextMoney!;
    const cart = buyCart(station, 'simple', money);
    expect(cart.ok).toBe(true);
    money = cart.nextMoney!;
    expect(placeEngine(station, platform, 'Mechanical').ok).toBe(true);
    expect(addCart(station, platform.train!, 'simple').ok).toBe(true);

    // Route + dispatch at t=0.
    expect(assignRoute(platform.train!, { id: '2,0', name: 'City', type: 'city', distance: 0, basePayout: 0, discovered: true }).ok).toBe(true);
    expect(dispatch(platform.train!, plot, world, '0,0', 0).ok).toBe(true);
    const duration = getTripDuration(2, 'Mechanical', 1);

    // Mid-trip: nothing completes.
    const mid = processTrains({ '0,0': plot }, world, money, duration - 1);
    expect(mid.completedTrips).toBe(0);

    // Trip completes: payout lands, train is idle, route survives.
    const done = processTrains({ '0,0': plot }, world, money, duration);
    expect(done.completedTrips).toBe(1);
    expect(done.nextMoney).toBe(money + getCityPayout(2, platform.train!.carts));
    expect(platform.train!.trip).toBeNull();
    expect(platform.train!.route).not.toBeNull();

    // Re-dispatch works (manual loop).
    expect(dispatch(platform.train!, plot, world, '0,0', duration).ok).toBe(true);
  });

  it('offline catch-up: a much-later single pass completes the in-flight trip', () => {
    const plot = makeTestPlot([0]);
    const world: WorldState = {
      cells: [makeCell('0,0', 'plot'), makeCell('0,3', 'factory', false)],
      plots: {},
      activePlotCellId: '0,0',
      inspectedCellId: null,
    };
    buildStation(plot, 1000, '0,0');
    const station = plot.station!;
    const platform = station.platforms[0];
    buyEngine(station, plot, 'Mechanical', 1000);
    placeEngine(station, platform, 'Mechanical');

    // Explore trip dispatched at t=1000, app "closes", reopens days later.
    expect(dispatchExplore(platform.train!, world, '0,3', '0,0', 1_000).ok).toBe(true);
    const daysLater = 1_000 + 3 * 24 * 60 * 60 * 1000;

    const result = processTrains({ '0,0': plot }, world, 0, daysLater);
    expect(result.completedTrips).toBe(1);
    expect(world.cells.find((c) => c.id === '0,3')?.discovered).toBe(true);
    expect(platform.train!.trip).toBeNull(); // idle again — manual dispatch means only one completion
  });
});
