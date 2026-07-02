// src/logic/station/stationTypes.test.ts
import { describe, it, expect } from 'vitest';
import {
  cloneStation,
  createEmptyStation,
  createPlatform,
  createTrain,
  getCartCapacity,
  getTotalCartCount,
  getTripRemainingMs,
  isTraveling,
} from './stationTypes';

function makeTrainWithCarts() {
  const train = createTrain('t1', 'Steam');
  train.carts.push({ type: 'passenger', cartType: 'simple', count: 2 });
  train.carts.push({ type: 'cargo', cartType: 'cargo', count: 1 });
  return train;
}

describe('train helpers', () => {
  it('creates an idle train with no route and no trip', () => {
    const train = createTrain('t1', 'Mechanical');
    expect(train.route).toBeNull();
    expect(train.trip).toBeNull();
    expect(isTraveling(train)).toBe(false);
  });

  it('counts carts and capacity by role', () => {
    const train = makeTrainWithCarts();
    expect(getTotalCartCount(train)).toBe(3);
    expect(getCartCapacity(train, 'passenger')).toBe(8); // 2 × simple(4)
    expect(getCartCapacity(train, 'cargo')).toBe(10); // 1 × cargo(10)
  });

  it('derives remaining trip time clamped at zero', () => {
    const trip = { kind: 'route' as const, targetCellId: '1,0', departedAt: 1_000, durationMs: 5_000, cargo: {} };
    expect(getTripRemainingMs(trip, 2_000)).toBe(4_000);
    expect(getTripRemainingMs(trip, 99_000)).toBe(0);
  });
});

describe('cloneStation', () => {
  it('deep-clones platforms, trains, trips, and inventory', () => {
    const station = createEmptyStation('s1');
    const platform = createPlatform('p1', 0, 0);
    platform.train = makeTrainWithCarts();
    platform.train.trip = { kind: 'route', targetCellId: '1,0', departedAt: 1, durationMs: 2, cargo: { coal: 3 } };
    station.platforms.push(platform);
    station.trainyardInventory.engines.Steam = 2;

    const copy = cloneStation(station);
    copy.platforms[0].train!.carts[0].count = 99;
    copy.platforms[0].train!.trip!.cargo.coal = 99;
    copy.trainyardInventory.engines.Steam = 99;

    expect(station.platforms[0].train!.carts[0].count).toBe(2);
    expect(station.platforms[0].train!.trip!.cargo.coal).toBe(3);
    expect(station.trainyardInventory.engines.Steam).toBe(2);
  });
});
