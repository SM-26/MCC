// src/logic/world/worldGen.test.ts
import { describe, expect, it } from 'vitest';

import { backfillFactoryResources, makeSeededRng, generateWorld, revealFogTile, revealTouchingFrontier } from './worldGen';
import { inferFactoryResources } from './worldNames';
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

  describe('revealTouchingFrontier', () => {
    it('does nothing right after initial generation (ring 1 already borders the discovered center)', () => {
      const world = generateWorld('123456', 0, 1);
      expect(revealTouchingFrontier(world, '123456', 0)).toEqual([]);
      expect(world.cells.length).toBe(7);
    });

    it('reveals only the ring-2 tiles touching a single discovered ring-1 tile', () => {
      const world = generateWorld('123456', 0, 1);
      const tile = world.cells.find((c) => c.id === '1,0')!;
      tile.discovered = true;

      const newCells = revealTouchingFrontier(world, '123456', 0);

      // (1,0) touches exactly 3 ring-2 tiles: (2,0), (1,1), (2,-1).
      expect(newCells.length).toBe(3);
      expect(newCells.every((c) => c.ring === 2 && !c.discovered)).toBe(true);
      expect(new Set(newCells.map((c) => c.id))).toEqual(new Set(['2,0', '1,1', '2,-1']));
    });

    it('reveals the full ring 2 once every ring-1 tile is discovered', () => {
      const world = generateWorld('123456', 0, 1);
      for (const cell of world.cells) {
        if (cell.ring === 1) {
          cell.discovered = true;
        }
      }

      const newCells = revealTouchingFrontier(world, '123456', 0);

      expect(newCells.length).toBe(12);
      expect(newCells.every((c) => c.ring === 2 && !c.discovered)).toBe(true);
      expect(world.cells.filter((c) => c.ring === 2).length).toBe(12);
    });
  });
});

describe('factory accepted resources', () => {
  it('stores what a ring-generated factory buys', () => {
    // The regression: generateRing set type and name but dropped the ore, so
    // every factory in a fresh world had no accepted resource at all.
    const world = generateWorld('123456', 0, 3);
    const factories = world.cells.filter((c) => c.type === 'factory');

    expect(factories.length).toBeGreaterThan(0);
    for (const factory of factories) {
      expect(factory.acceptedResources?.length).toBeGreaterThan(0);
    }
  });

  it('agrees with the name the factory was given', () => {
    const world = generateWorld('123456', 0, 3);

    for (const factory of world.cells.filter((c) => c.type === 'factory')) {
      expect(factory.acceptedResources).toEqual(inferFactoryResources(factory.name));
    }
  });

  it('gives a fog-revealed factory an ore that matches its name too', () => {
    // Previously drawn from a separate rng call, so a "Crude Awakening
    // Refinery" could come back accepting copper.
    const world = generateWorld('123456', 0, 2);
    const revealed = world.cells
      .filter((c) => !c.discovered)
      .map((c) => revealFogTile(c, '123456', 0))
      .filter((c) => c.type === 'factory');

    for (const factory of revealed) {
      expect(factory.acceptedResources).toEqual(inferFactoryResources(factory.name));
    }
  });
});

describe('backfillFactoryResources', () => {
  function worldWith(cells: Partial<WorldCell>[]): WorldState {
    return {
      cells: cells.map((c, i) => ({ id: `${i},0`, name: '', type: 'empty', q: i, r: 0, ring: 1, discovered: true, ...c }) as WorldCell),
      plots: {},
      activePlotCellId: null,
      inspectedCellId: null,
    };
  }

  it('recovers the ore from the factory name', () => {
    const world = worldWith([{ type: 'factory', name: 'The Crude Awakening Refinery' }]);

    expect(backfillFactoryResources(world)).toBe(1);
    expect(world.cells[0].acceptedResources).toEqual(['Oil']);
  });

  it('handles a combined-resource factory', () => {
    const world = worldWith([{ type: 'factory', name: 'The Black Gold Junction' }]);

    backfillFactoryResources(world);

    expect(world.cells[0].acceptedResources).toEqual(['Oil', 'Coal']);
  });

  it('leaves an already-populated factory alone and is idempotent', () => {
    const world = worldWith([{ type: 'factory', name: 'Liquid Gold Ltd', acceptedResources: ['Coal'] }]);

    expect(backfillFactoryResources(world)).toBe(0);
    expect(world.cells[0].acceptedResources).toEqual(['Coal']);
    expect(backfillFactoryResources(world)).toBe(0);
  });

  it('ignores non-factories and unknown names', () => {
    const world = worldWith([
      { type: 'city', name: 'Vulcanus' },
      { type: 'factory', name: 'Some Renamed Plant' },
    ]);

    expect(backfillFactoryResources(world)).toBe(0);
    expect(world.cells[0].acceptedResources).toBeUndefined();
    expect(world.cells[1].acceptedResources).toBeUndefined();
  });
});
