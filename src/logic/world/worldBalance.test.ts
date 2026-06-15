// src/logic/world/worldBalance.test.ts
import { describe, expect, it } from 'vitest';

import { getRingTileCount, getRingConfig, calculateFactoryCount, isTileKindAllowed } from './worldBalance';

describe('worldBalance', () => {
  describe('getRingTileCount', () => {
    it('should return 1 for ring 0', () => {
      expect(getRingTileCount(0)).toBe(1);
    });

    it('should return 6 for ring 1', () => {
      expect(getRingTileCount(1)).toBe(6);
    });

    it('should return 12 for ring 2', () => {
      expect(getRingTileCount(2)).toBe(12);
    });

    it('should return 30 for ring 5', () => {
      expect(getRingTileCount(5)).toBe(30);
    });
  });

  describe('getRingConfig', () => {
    it('should return config for ring 1', () => {
      const ring1Config = getRingConfig(1);
      expect(ring1Config.pool).toContain('city');
      expect(ring1Config.pool).toContain('factory');
      expect(ring1Config.nonEmptyCap).toBe(3);
      expect(ring1Config.factoryToCityRatio).toBe(1);
    });

    it('should allow blocker in ring 4', () => {
      const ring4Config = getRingConfig(4);
      expect(isTileKindAllowed(ring4Config, 'blocker')).toBe(true);
    });

    it('should not allow blocker in ring 1', () => {
      const ring1Config = getRingConfig(1);
      expect(isTileKindAllowed(ring1Config, 'blocker')).toBe(false);
    });

    it('should fallback to ring 5 config for rings > 5', () => {
      const ring6Config = getRingConfig(6);
      expect(ring6Config.nonEmptyCap).toBe(14);
    });
  });

  describe('calculateFactoryCount', () => {
    it('should calculate 3 factories for 2 cities with ratio 1.5', () => {
      expect(calculateFactoryCount(2, 1.5)).toBe(3);
    });

    it('should calculate 3 factories for 3 cities with ratio 1', () => {
      expect(calculateFactoryCount(3, 1)).toBe(3);
    });
  });
});
