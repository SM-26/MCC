// src/logic/station/stationActions.test.ts
import { describe, it, expect } from 'vitest';
import { createEmptyAgeResources, createMineTile } from '../mine/mineTypes';
import type { MineDepthState, PlotState } from '../mine/mineTypes';
import { addCart, assignRoute, buildPlatform, buildStation, buyCart, buyEngine, dispatch, dispatchExplore, isPlatformDepth, placeEngine, removeCart, removeTrain } from './stationActions';
import { createEmptyStation, createPlatform } from './stationTypes';
import { CART_STATS, ENGINE_STATS, getPlatformCost, getTripDuration } from './stationBalance';
import type { WorldCell, WorldState } from '../world/worldTypes';

export function makeClearedDepth(depth: number): MineDepthState {
  // A 1×1 grid holding a hard-cleared (empty) tile — getClearStatus() === 'hard'.
  return { depth, rows: 1, cols: 1, tiles: [[createMineTile('empty')]], miners: [] };
}

export function makeTestPlot(depths: number[] = [0]): PlotState {
  return {
    currentAge: 'Steam',
    ageResources: { ...createEmptyAgeResources(), coal: 50 },
    mineshafts: [{ mineDepths: depths.map(makeClearedDepth), selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }],
    activeMineshaftIndex: 0,
    station: null,
  };
}

describe('isPlatformDepth', () => {
  it('accepts 0, 6, 11, 16 and rejects 1', () => {
    expect(isPlatformDepth(0)).toBe(true);
    expect(isPlatformDepth(1)).toBe(false);
    expect(isPlatformDepth(6)).toBe(true);
    expect(isPlatformDepth(11)).toBe(true);
    expect(isPlatformDepth(16)).toBe(true);
    expect(isPlatformDepth(5)).toBe(false);
  });
});

describe('buildPlatform cost', () => {
  it('charges money and current-age resources per getPlatformCost', () => {
    const plot = makeTestPlot([0, 6]);
    const built = buildStation(plot, 1000, '0,0');
    expect(built.ok).toBe(true);

    const cost = getPlatformCost(6, 'Steam');
    const result = buildPlatform(plot.station!, plot, 0, 6, 1000);
    expect(result.ok).toBe(true);
    expect(result.nextMoney).toBe(1000 - cost.money);
    expect(plot.ageResources.coal).toBe(50 - (cost.resources.coal ?? 0));
  });

  it('rejects when age resources are insufficient', () => {
    const plot = makeTestPlot([0, 6]);
    plot.ageResources.coal = 0;
    buildStation(plot, 1000, '0,0');

    const result = buildPlatform(plot.station!, plot, 0, 6, 1000);
    expect(result.ok).toBe(false);
    expect(plot.station!.platforms).toHaveLength(1);
  });

  it('no longer offers depth 1', () => {
    const plot = makeTestPlot([0, 1, 6]);
    buildStation(plot, 1000, '0,0');
    const result = buildPlatform(plot.station!, plot, 0, 1, 1000);
    expect(result.ok).toBe(false);
  });
});

describe('buyEngine', () => {
  it('buys an engine into the pool, deducting money and resources', () => {
    const plot = makeTestPlot();
    const station = createEmptyStation('s1');
    const result = buyEngine(station, plot, 'Steam', 1000);

    expect(result.ok).toBe(true);
    expect(result.nextMoney).toBe(1000 - ENGINE_STATS.Steam.cost.money);
    expect(plot.ageResources.coal).toBe(50 - (ENGINE_STATS.Steam.cost.resources.coal ?? 0));
    expect(station.trainyardInventory.engines.Steam).toBe(1);
  });

  it('gates by plot currentAge', () => {
    const plot = makeTestPlot();
    plot.currentAge = 'Mechanical';
    const station = createEmptyStation('s1');
    expect(buyEngine(station, plot, 'Steam', 99_999).ok).toBe(false);
  });

  it('rejects on insufficient money or resources', () => {
    const plot = makeTestPlot();
    const station = createEmptyStation('s1');
    expect(buyEngine(station, plot, 'Steam', 10).ok).toBe(false);
    plot.ageResources.coal = 0;
    expect(buyEngine(station, plot, 'Steam', 1000).ok).toBe(false);
    expect(station.trainyardInventory.engines.Steam ?? 0).toBe(0);
  });
});

describe('buyCart', () => {
  it('buys a cart into the pool', () => {
    const station = createEmptyStation('s1');
    const result = buyCart(station, 'simple', 1000);
    expect(result.ok).toBe(true);
    expect(result.nextMoney).toBe(1000 - CART_STATS.simple.cost.money);
    expect(station.trainyardInventory.carts.simple).toBe(1);
  });

  it('rejects on insufficient money', () => {
    const station = createEmptyStation('s1');
    expect(buyCart(station, 'simple', 5).ok).toBe(false);
  });
});

function makeYard() {
  const station = createEmptyStation('s1');
  const platform = createPlatform('p1', 0, 0);
  station.platforms.push(platform);
  station.trainyardInventory.engines.Mechanical = 1;
  station.trainyardInventory.carts.simple = 3;
  return { station, platform };
}

describe('placeEngine / removeTrain', () => {
  it('moves an engine from pool to platform and back', () => {
    const { station, platform } = makeYard();

    expect(placeEngine(station, platform, 'Mechanical').ok).toBe(true);
    expect(platform.train?.engineAge).toBe('Mechanical');
    expect(station.trainyardInventory.engines.Mechanical).toBe(0);
    expect(placeEngine(station, platform, 'Mechanical').ok).toBe(false); // occupied + empty pool

    expect(addCart(station, platform.train!, 'simple').ok).toBe(true);
    expect(removeTrain(station, platform).ok).toBe(true);
    expect(platform.train).toBeNull();
    expect(station.trainyardInventory.engines.Mechanical).toBe(1);
    expect(station.trainyardInventory.carts.simple).toBe(3); // cart returned too
  });

  it('blocks removal while traveling', () => {
    const { station, platform } = makeYard();
    placeEngine(station, platform, 'Mechanical');
    platform.train!.trip = { kind: 'route', targetCellId: '1,0', departedAt: 0, durationMs: 9_999, cargo: {} };
    expect(removeTrain(station, platform).ok).toBe(false);
  });
});

describe('addCart / removeCart', () => {
  it('respects the engine maxCarts and pool stock', () => {
    const { station, platform } = makeYard();
    placeEngine(station, platform, 'Mechanical'); // maxCarts: 2
    const train = platform.train!;

    expect(addCart(station, train, 'simple').ok).toBe(true);
    expect(addCart(station, train, 'simple').ok).toBe(true);
    expect(addCart(station, train, 'simple').ok).toBe(false); // maxCarts hit
    expect(train.carts).toEqual([{ type: 'passenger', cartType: 'simple', count: 2 }]);
    expect(station.trainyardInventory.carts.simple).toBe(1);

    expect(removeCart(station, train, 'simple').ok).toBe(true);
    expect(train.carts[0].count).toBe(1);
    expect(station.trainyardInventory.carts.simple).toBe(2);
    expect(removeCart(station, train, 'cargo').ok).toBe(false); // none attached
  });

  it('rejects when the pool has no such cart', () => {
    const { station, platform } = makeYard();
    placeEngine(station, platform, 'Mechanical');
    expect(addCart(station, platform.train!, 'luxury').ok).toBe(false);
  });
});

function makeCell(id: string, type: WorldCell['type'], discovered = true): WorldCell {
  const [q, r] = id.split(',').map(Number);
  return { id, name: id, type, q, r, ring: Math.max(Math.abs(q), Math.abs(r)), discovered };
}

function makeWorld(cells: WorldCell[]): WorldState {
  return { cells, plots: {}, activePlotCellId: '0,0', inspectedCellId: null };
}

function makeReadyTrain() {
  const { station, platform } = makeYard();
  station.trainyardInventory.carts.cargo = 2;
  placeEngine(station, platform, 'Mechanical');
  addCart(station, platform.train!, 'simple');
  addCart(station, platform.train!, 'cargo');
  return platform.train!;
}

describe('assignRoute', () => {
  it('assigns a discovered destination and rejects undiscovered', () => {
    const train = makeReadyTrain();
    const city = { id: '2,0', name: 'City', type: 'city' as const, distance: 0, basePayout: 0, discovered: true };
    expect(assignRoute(train, city).ok).toBe(true);
    expect(train.route).toEqual({ destinationId: '2,0', destinationType: 'city' });
    expect(assignRoute(train, { ...city, discovered: false }).ok).toBe(false);
  });
});

describe('dispatch', () => {
  it('starts a timestamped round trip and loads cargo for a factory route', () => {
    const train = makeReadyTrain();
    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('3,0', 'factory')]);
    const plot = makeTestPlot();
    assignRoute(train, { id: '3,0', name: 'F', type: 'factory', distance: 0, basePayout: 0, discovered: true });

    const result = dispatch(train, plot, world, '0,0', 5_000);
    expect(result.ok).toBe(true);
    expect(train.trip).toMatchObject({
      kind: 'route',
      targetCellId: '3,0',
      departedAt: 5_000,
      durationMs: getTripDuration(3, 'Mechanical', 1),
      cargo: { coal: 10 }, // cargo capacity 10, greedy from 50 coal
    });
    expect(plot.ageResources.coal).toBe(40); // deducted at dispatch

    expect(dispatch(train, plot, world, '0,0', 6_000).ok).toBe(false); // already traveling
  });

  it('loads no cargo for a city route', () => {
    const train = makeReadyTrain();
    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('2,0', 'city')]);
    const plot = makeTestPlot();
    assignRoute(train, { id: '2,0', name: 'C', type: 'city', distance: 0, basePayout: 0, discovered: true });

    expect(dispatch(train, plot, world, '0,0', 0).ok).toBe(true);
    expect(train.trip?.cargo).toEqual({});
    expect(plot.ageResources.coal).toBe(50);
  });

  it('requires a route', () => {
    const train = makeReadyTrain();
    expect(dispatch(train, makeTestPlot(), makeWorld([makeCell('0,0', 'plot')]), '0,0', 0).ok).toBe(false);
  });
});

describe('dispatchExplore', () => {
  it('sends a train to an undiscovered cell without touching the standing route', () => {
    const train = makeReadyTrain();
    const city = { id: '2,0', name: 'C', type: 'city' as const, distance: 0, basePayout: 0, discovered: true };
    assignRoute(train, city);

    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('0,4', 'city', false)]);
    const result = dispatchExplore(train, world, '0,4', '0,0', 1_000);
    expect(result.ok).toBe(true);
    expect(train.trip).toMatchObject({ kind: 'explore', targetCellId: '0,4', departedAt: 1_000, cargo: {} });
    expect(train.route).toEqual({ destinationId: '2,0', destinationType: 'city' });
  });

  it('rejects discovered or unknown cells', () => {
    const train = makeReadyTrain();
    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('1,0', 'city', true)]);
    expect(dispatchExplore(train, world, '1,0', '0,0', 0).ok).toBe(false);
    expect(dispatchExplore(train, world, '9,9', '0,0', 0).ok).toBe(false);
  });
});
