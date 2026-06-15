// src/logic/world/worldPathing.test.ts
import { describe, expect, it } from 'vitest';

import { getTileTraversalCost, isTilePassable, hexDistance, getEngineSpeedFactor, getTrainWeight } from './worldPathing';
import type { WorldState } from './worldTypes';
import { findRoute, getRouteTravelTime } from './worldPathing';
import type { TrainData } from './worldPathing';

describe('worldPathing', () => {
  describe('getTileTraversalCost', () => {
    it('should return Infinity for fog', () => {
      expect(getTileTraversalCost('fog')).toBe(Infinity);
    });

    it('should return Infinity for blocker', () => {
      expect(getTileTraversalCost('blocker')).toBe(Infinity);
    });

    it('should return 0 for empty', () => {
      expect(getTileTraversalCost('empty')).toBe(0);
    });

    it('should return -1 for plot', () => {
      expect(getTileTraversalCost('plot')).toBe(-1);
    });

    it('should return -1 for city', () => {
      expect(getTileTraversalCost('city')).toBe(-1);
    });

    it('should return -1 for factory', () => {
      expect(getTileTraversalCost('factory')).toBe(-1);
    });
  });

  describe('isTilePassable', () => {
    it('should not pass fog', () => {
      expect(isTilePassable('fog')).toBe(false);
    });

    it('should not pass blocker', () => {
      expect(isTilePassable('blocker')).toBe(false);
    });

    it('should pass empty', () => {
      expect(isTilePassable('empty')).toBe(true);
    });

    it('should pass city', () => {
      expect(isTilePassable('city')).toBe(true);
    });
  });

  describe('hexDistance', () => {
    it('should calculate distance correctly', () => {
      const coord1 = { q: 0, r: 0 };
      const coord2 = { q: 3, r: -2 };
      expect(hexDistance(coord1, coord2)).toBe(3);
    });
  });

  describe('getEngineSpeedFactor', () => {
    it('should return 1.0 for Basic L1', () => {
      expect(getEngineSpeedFactor('Basic', 1)).toBe(1.0);
    });

    it('should return 1.2 for Steam L1', () => {
      expect(getEngineSpeedFactor('Steam', 1)).toBe(1.2);
    });

    it('should add level bonus', () => {
      expect(getEngineSpeedFactor('Basic', 5)).toBe(1.2);
    });
  });

  describe('getTrainWeight', () => {
    it('should calculate weight based on carts', () => {
      const train: TrainData = {
        engineAge: 'Basic',
        engineLevel: 1,
        carts: [{ type: 'passenger', cartType: 'simple', count: 2 }],
      };
      const weight = getTrainWeight(train);
      expect(weight).toBe(20); // 10 + 2*5
    });
  });

  describe('findRoute', () => {
    const testWorld: WorldState = {
      cells: [
        { id: '0,0', name: 'Prague', type: 'plot', q: 0, r: 0, ring: 0, discovered: true },
        { id: '1,0', name: '', type: 'empty', q: 1, r: 0, ring: 1, discovered: true },
        { id: '0,1', name: 'Atlantis', type: 'city', q: 0, r: 1, ring: 1, discovered: true },
        { id: '-1,1', name: '', type: 'blocker', q: -1, r: 1, ring: 1, discovered: true },
      ],
      plots: [{ plotId: 'p1', cellId: '0,0', plotName: 'Prague', discovered: true }],
      activePlotIndex: 0,
    };

    it('should find route to same position', () => {
      const route = findRoute({ q: 0, r: 0 }, { q: 0, r: 0 }, testWorld);
      expect(route).toBeDefined();
      expect(route!.path.length).toBe(1);
    });

    it('should find route through empty tiles', () => {
      const route = findRoute({ q: 0, r: 0 }, { q: 1, r: 0 }, testWorld);
      expect(route).toBeDefined();
      expect(route!.path.length).toBe(2);
    });

    it('should not route through blocker', () => {
      const route = findRoute({ q: 0, r: 0 }, { q: -1, r: 1 }, testWorld);
      expect(route).toBe(null);
    });
  });

  describe('getRouteTravelTime', () => {
    const testWorld: WorldState = {
      cells: [
        { id: '0,0', name: 'Prague', type: 'plot', q: 0, r: 0, ring: 0, discovered: true },
        { id: '1,0', name: '', type: 'empty', q: 1, r: 0, ring: 1, discovered: true },
      ],
      plots: [{ plotId: 'p1', cellId: '0,0', plotName: 'Prague', discovered: true }],
      activePlotIndex: 0,
    };

    it('should calculate travel time', () => {
      const route = findRoute({ q: 0, r: 0 }, { q: 1, r: 0 }, testWorld);
      expect(route).toBeDefined();

      const train: TrainData = {
        engineAge: 'Basic',
        engineLevel: 1,
        carts: [{ type: 'passenger', cartType: 'simple', count: 2 }],
      };

      const time = getRouteTravelTime(route!, train);
      expect(time).toBeGreaterThanOrEqual(1);
    });
  });
});
