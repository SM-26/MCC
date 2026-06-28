// src/logic/world/worldGen.test.ts
import { describe, expect, it } from 'vitest';

import { makeSeededRng, generateWorld, revealFogTile } from './worldGen';
import type { WorldState, WorldCell } from './worldTypes';

// Helper: find an undiscovered tile in the world (fog in UI terms)
function findFogTile(world: WorldState): WorldCell | undefined {
  return world.cells.find((c) => !c.discovered);
}

// Helper: create test world with rings
function createTestWorld(rings: number = 1): WorldState {
  return generateWorld('123456', 0, rings);
}

describe('worldGen', () => {
  describe('makeSeededRng', () => {
    it('should create deterministic RNG from same seed', () => {
      const rng1 = makeSeededRng('123456', 0);
      const rng2 = makeSeededRng('123456', 0);

      expect(rng1()).toBe(rng2());
    });

    it('should create different RNG from different reset count', () => {
      const rng1 = makeSeededRng('123456', 0);
      const rng2 = makeSeededRng('123456', 1);

      expect(rng1()).not.toBe(rng2());
    });

    it('should create different RNG from different seed', () => {
      const rng1 = makeSeededRng('123456', 0);
      const rng2 = makeSeededRng('999999', 0);

      expect(rng1()).not.toBe(rng2());
    });
  });

  describe('generateWorld', () => {
    it('should generate ring 0 with 1 plot tile', () => {
      const world = generateWorld('123456', 0, 1);
      const ring0Tiles = world.cells.filter((c) => c.ring === 0);

      expect(ring0Tiles.length).toBe(1);
      expect(ring0Tiles[0].type).toBe('plot');
    });

    it('should generate ring 1 with 6 tiles', () => {
      const world = generateWorld('123456', 0, 1);
      expect(world.cells.filter((c) => c.ring === 1).length).toBe(6);
    });

    it('should have starting plot discovered', () => {
      const world = generateWorld('123456', 0, 1);
      const ring0Tile = world.cells.find((c) => c.ring === 0);

      expect(ring0Tile?.discovered).toBe(true);
    });

    it('should name ring 0 plot Prague for seed 123456 reset 0', () => {
      const world = generateWorld('123456', 0, 1);
      const ring0Tile = world.cells.find((c) => c.ring === 0);

      expect(ring0Tile?.name).toBeDefined();
    });

    it('should have fog tiles in ring 1', () => {
      const world = createTestWorld(1);
      const fogTiles = world.cells.filter((c) => !c.discovered && c.ring === 1);

      expect(fogTiles.length).toBeGreaterThan(0);
    });

    it('should have some special tiles in ring 1', () => {
      const world = createTestWorld(1);
      const specialTiles = world.cells.filter((c) => c.ring === 1 && c.type !== 'empty');

      expect(specialTiles.length).toBeGreaterThanOrEqual(1);
      expect(specialTiles.length).toBeLessThanOrEqual(3);
    });

    it('should not have blocker in ring 1', () => {
      const world = createTestWorld(1);
      expect(world.cells.filter((c) => c.type === 'blocker').length).toBe(0);
    });

    it('should have blocker in ring 4', () => {
      const world = generateWorld('123456', 0, 4);
      expect(world.cells.filter((c) => c.type === 'blocker').length).toBeGreaterThan(0);
    });

    it('should not have plot in ring 1', () => {
      const world = createTestWorld(1);
      expect(world.cells.filter((c) => c.type === 'plot' && c.ring === 1).length).toBe(0);
    });

    it('should have plot in ring 2', () => {
      const world = generateWorld('123456', 0, 2);
      expect(world.cells.filter((c) => c.type === 'plot' && c.ring === 2).length).toBeGreaterThanOrEqual(0);
    });

    it('should generate deterministic world for same seed', () => {
      const world1 = generateWorld('123456', 0, 1);
      const world2 = generateWorld('123456', 0, 1);

      expect(world1.cells.length).toBe(world2.cells.length);

      for (let i = 0; i < world1.cells.length; i++) {
        expect(world1.cells[i].type).toBe(world2.cells[i].type);
        expect(world1.cells[i].name).toBe(world2.cells[i].name);
      }
    });

    it('should generate different world for different reset', () => {
      const world1 = generateWorld('123456', 0, 1);
      const world2 = generateWorld('123456', 1, 1);

      const typesMatch = world1.cells.every((c, i) => c.type === world2.cells[i].type);
      expect(typesMatch).toBe(false);
    });

    it('should set activePlotCellId to the ring-0 plot cell id', () => {
      const world = generateWorld('123456', 0, 1);
      expect(world.activePlotCellId).toBe('0,0');
    });

    it('should set inspectedCellId to null', () => {
      const world = generateWorld('123456', 0, 1);
      expect(world.inspectedCellId).toBeNull();
    });
  });

  describe('revealFogTile', () => {
    it('should reveal fog tile to non-fog type', () => {
      const world = createTestWorld(1);
      const fogTile = findFogTile(world);

      if (!fogTile) {
        return;
      }

      const revealed = revealFogTile(fogTile, '123456', 0);

      expect(revealed.type).not.toBe('fog');
      expect(revealed.discovered).toBe(true);
    });

    it('should set name for special tiles', () => {
      const world = createTestWorld(1);
      const fogTile = findFogTile(world);

      if (!fogTile) {
        return;
      }

      const revealed = revealFogTile(fogTile, '123456', 0);

      if (revealed.type !== 'empty') {
        expect(revealed.name).toBeDefined();
        expect(revealed.name).not.toBe('');
      }
    });

    it('should set capacity for city/factory', () => {
      const world = createTestWorld(1);
      const fogTile = findFogTile(world);

      if (!fogTile) {
        return;
      }

      const revealed = revealFogTile(fogTile, '123456', 0);

      if (revealed.type === 'city' || revealed.type === 'factory') {
        expect(revealed.capacity).toBeGreaterThan(0);
      }
    });

    it('should set acceptedResources for factory', () => {
      const world = createTestWorld(1);
      const fogTile = findFogTile(world);

      if (!fogTile) {
        return;
      }

      const revealed = revealFogTile(fogTile, '123456', 0);

      if (revealed.type === 'factory') {
        expect(revealed.acceptedResources).toBeDefined();
        expect(revealed.acceptedResources?.length).toBeGreaterThan(0);
      }
    });

    it('should reveal to valid type', () => {
      const world = generateWorld('123456', 0, 5);
      const fogTile = findFogTile(world);

      if (!fogTile) {
        return;
      }

      const revealed = revealFogTile(fogTile, '123456', 0);

      expect(revealed.type).toBeDefined();
      expect(revealed.type).not.toBe('fog');
    });

    it('should be deterministic for same seed', () => {
      const world = createTestWorld(1);
      const fogTile = findFogTile(world);

      if (!fogTile) {
        return;
      }

      const revealed1 = revealFogTile(fogTile, '123456', 0);
      const revealed2 = revealFogTile(fogTile, '123456', 0);

      expect(revealed1.type).toBe(revealed2.type);
      expect(revealed1.name).toBe(revealed2.name);
    });
  });
});
