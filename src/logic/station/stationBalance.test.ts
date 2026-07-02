import { describe, it, expect } from 'vitest';
import { createEmptyAgeResources } from '../mine/mineTypes';
import {
  AGE_ORDER,
  ENGINE_STATS,
  CART_STATS,
  getCargoSaleValue,
  getCityPayout,
  getPlatformCost,
  getTripDuration,
  isAgeAtLeast,
  planCargoLoad,
  RESOURCE_VALUE,
} from './stationBalance';

describe('isAgeAtLeast', () => {
  it('orders ages Mechanical → Maglev', () => {
    expect(AGE_ORDER).toEqual(['Mechanical', 'Steam', 'Diesel', 'Electric', 'Maglev']);
    expect(isAgeAtLeast('Steam', 'Mechanical')).toBe(true);
    expect(isAgeAtLeast('Steam', 'Steam')).toBe(true);
    expect(isAgeAtLeast('Steam', 'Diesel')).toBe(false);
  });
});

describe('getPlatformCost', () => {
  it('is money-only at depth 0', () => {
    expect(getPlatformCost(0, 'Steam')).toEqual({ money: 100, resources: {} });
  });

  it('adds current-age resources at deeper platforms and scales money with depth', () => {
    const cost = getPlatformCost(6, 'Steam');
    expect(cost.money).toBeGreaterThan(100);
    expect(cost.resources).toEqual({ coal: 3 });
    expect(getPlatformCost(11, 'Steam').money).toBeGreaterThan(cost.money);
  });

  it('is money-only for Mechanical age (no age resource yet)', () => {
    expect(getPlatformCost(6, 'Mechanical').resources).toEqual({});
  });
});

describe('getTripDuration', () => {
  it('scales linearly with distance and inversely with engine speed', () => {
    const d1 = getTripDuration(1, 'Mechanical', 1);
    expect(getTripDuration(2, 'Mechanical', 1)).toBe(d1 * 2);
    expect(getTripDuration(1, 'Steam', 1)).toBe(d1 / ENGINE_STATS.Steam.speed);
  });

  it('gets faster with engine level', () => {
    expect(getTripDuration(4, 'Mechanical', 2)).toBeLessThan(getTripDuration(4, 'Mechanical', 1));
  });
});

describe('getCityPayout', () => {
  it('pays only for passenger carts, scaled by capacity and multiplier', () => {
    const carts = [
      { type: 'passenger' as const, cartType: 'simple' as const, count: 2 },
      { type: 'cargo' as const, cartType: 'cargo' as const, count: 3 },
    ];
    const perCart = CART_STATS.simple.capacity * CART_STATS.simple.valueMultiplier;
    expect(getCityPayout(0, carts)).toBe(Math.round(10 * perCart * 2));
    expect(getCityPayout(0, [])).toBe(0);
  });

  it('pays more for farther cities (ring)', () => {
    const carts = [{ type: 'passenger' as const, cartType: 'simple' as const, count: 1 }];
    expect(getCityPayout(3, carts)).toBeGreaterThan(getCityPayout(1, carts));
  });
});

describe('getCargoSaleValue', () => {
  it('sums units × resource value', () => {
    expect(getCargoSaleValue({ coal: 10, oil: 2 })).toBe(10 * RESOURCE_VALUE.coal + 2 * RESOURCE_VALUE.oil);
    expect(getCargoSaleValue({})).toBe(0);
  });
});

describe('planCargoLoad', () => {
  it('fills capacity most-valuable-first without exceeding available', () => {
    const available = { ...createEmptyAgeResources(), coal: 100, copper: 5 };
    expect(planCargoLoad(20, available)).toEqual({ copper: 5, coal: 15 });
  });

  it('returns empty for zero capacity or empty stock', () => {
    expect(planCargoLoad(0, { ...createEmptyAgeResources(), coal: 5 })).toEqual({});
    expect(planCargoLoad(10, createEmptyAgeResources())).toEqual({});
  });
});
