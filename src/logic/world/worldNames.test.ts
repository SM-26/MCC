// src/logic/world/worldNames.test.ts
import { describe, expect, it } from 'vitest';

import {
  PLOT_NAMES,
  CITY_NAMES,
  FACTORY_NAMES,
  createNameState,
  pickUniquePlotName,
  pickUniqueCityName,
  pickFactoryName,
  pickFactoryNameForResources,
  isPlotNameAvailable,
  isCityNameAvailable,
  areBothPoolsDepleted,
  canIgnoreReset,
  isRing0,
  getReservedNames,
} from './worldNames';
import type { ResourceType } from './worldTypes';

// Mock RNG for testing
function createMockRng(seed: number = 0.5): () => number {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

describe('worldNames', () => {
  describe('name pools', () => {
    it('should have 12 plot names', () => {
      expect(PLOT_NAMES.length).toBe(12);
    });

    it('should have 7 city names', () => {
      expect(CITY_NAMES.length).toBe(7);
    });

    it('should have factory name pools for resources', () => {
      expect(Object.keys(FACTORY_NAMES).length).toBeGreaterThan(0);
      expect(FACTORY_NAMES.Oil).toBeDefined();
      expect(FACTORY_NAMES.Coal).toBeDefined();
    });
  });

  describe('NameState', () => {
    it('should create initial state with empty sets', () => {
      const state = createNameState();
      expect(state.usedPlotNames.size).toBe(0);
      expect(state.usedCityNames.size).toBe(0);
      expect(state.plotNamesDepleted).toBe(false);
      expect(state.cityNamesDepleted).toBe(false);
    });
  });

  describe('pickUniquePlotName', () => {
    it('should pick a plot name', () => {
      const state = createNameState();
      const rng = createMockRng();
      const name = pickUniquePlotName(state, rng);

      expect(name).toBeDefined();
      expect(isPlotNameAvailable(state, name!)).toBe(false);
    });

    it('should not pick same name twice', () => {
      const state = createNameState();
      const rng = createMockRng();

      const name1 = pickUniquePlotName(state, rng);
      const name2 = pickUniquePlotName(state, rng);

      expect(name1).not.toBe(name2);
    });
  });

  describe('pickUniqueCityName', () => {
    it('should pick a city name', () => {
      const state = createNameState();
      const rng = createMockRng();
      const name = pickUniqueCityName(state, rng);

      expect(name).toBeDefined();
      expect(isCityNameAvailable(state, name!)).toBe(false);
    });
  });

  describe('pickFactoryName', () => {
    it('should pick a factory name for Oil', () => {
      const rng = createMockRng();
      const name = pickFactoryName('Oil', rng);
      expect(name).toBeDefined();
      expect(name).not.toBe('');
    });

    it('should pick a factory name for Coal', () => {
      const rng = createMockRng();
      const name = pickFactoryName('Coal', rng);
      expect(name).toBeDefined();
    });

    it('should fallback to generic name for unknown resource', () => {
      const rng = createMockRng();
      const name = pickFactoryName('UnknownResource', rng);
      expect(name).toBe('The Industrial Complex');
    });
  });

  describe('pickFactoryNameForResources', () => {
    it('should pick name for single resource', () => {
      const rng = createMockRng();
      const name = pickFactoryNameForResources(['Oil'] as ResourceType[], rng);
      expect(name).toBeDefined();
    });

    it('should pick name for multiple resources', () => {
      const rng = createMockRng();
      const name = pickFactoryNameForResources(['Oil', 'Coal'] as ResourceType[], rng);
      expect(name).toBeDefined();
    });

    it('should fallback to first resource for empty array', () => {
      const rng = createMockRng();
      const name = pickFactoryNameForResources([], rng);
      expect(name).toBeDefined();
    });
  });

  describe('depletion behavior', () => {
    it('should not be depleted initially', () => {
      const state = createNameState();
      expect(areBothPoolsDepleted(state)).toBe(false);
      expect(canIgnoreReset(state)).toBe(true);
    });

    it('should allow ignoring reset if one pool has names', () => {
      const state = createNameState();
      state.plotNamesDepleted = true;
      state.cityNamesDepleted = false;

      expect(canIgnoreReset(state)).toBe(true);
      expect(areBothPoolsDepleted(state)).toBe(false);
    });
  });

  describe('ring helpers', () => {
    it('should identify ring 0', () => {
      expect(isRing0(0)).toBe(true);
      expect(isRing0(1)).toBe(false);
    });

    it('should return empty reserved names for ring 0', () => {
      expect(getReservedNames(0)).toHaveLength(0);
    });

    it('should reserve Prague for non-ring-0', () => {
      expect(getReservedNames(1)).toContain('Prague');
    });
  });
});
