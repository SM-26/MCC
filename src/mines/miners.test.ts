import { describe, beforeEach, test, expect } from 'vitest';
import { Plot } from '../core/types/state';
import { findBestMinerPlacement, placeMiner, getTileFacing, getDirection, getNeighbors, attemptMerge, buyMiner, calculateMinerCost } from './miners';

describe('Mines - Miner Placement', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('findBestMinerPlacement returns index of deepest empty tile', () => {
    // Arrange: Create a plot with mixed depths
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'empty' as const },
        { level: -3, type: 'empty' as const },
      ] as any[],
      miners: []
    };

    // Act: Find best placement
    const bestIndex = findBestMinerPlacement(plot);

    // Assert: Returns index of deepest empty tile (level -3)
    expect(bestIndex).toBe(2); // Index of tile with level -3
  });

  test('findBestMinerPlacement returns null when no empty tiles', () => {
    // Arrange: Create a plot with no empty tiles
    const plot = {
      tiles: [
        { level: 0, type: 'coal' as const },
        { level: -1, type: 'rubble' as const },
        { level: -2, type: 'oil' as const },
      ] as any[],
      miners: []
    };

    // Act: Find best placement
    const bestIndex = findBestMinerPlacement(plot);

    // Assert: Returns null (no empty tiles)
    expect(bestIndex).toBeNull();
  });

  test('findBestMinerPlacement handles plot with all rubble', () => {
    // Arrange: Create a plot with only rubble
    const plot = {
      tiles: [
        { level: 0, type: 'rubble' as const },
        { level: -1, type: 'rubble' as const },
        { level: -2, type: 'rubble' as const },
      ] as any[],
      miners: []
    };

    // Act: Find best placement
    const bestIndex = findBestMinerPlacement(plot);

    // Assert: Returns null (no empty tiles)
    expect(bestIndex).toBeNull();
  });

  test('placeMiner places miner at best available location', () => {
    // Arrange: Create a plot with empty tile
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: []
    };

    // Act: Place miner
    const miner = placeMiner(plot, 1);

    // Assert: Miner placed at deepest empty tile
    expect(miner.tileIndex).toBe(1); // Index of tile with level -1
    expect(miner.level).toBe(1);
  });

  test('placeMiner throws error when no room', () => {
    // Arrange: Create a plot with no empty tiles
    const plot = {
      tiles: [
        { level: 0, type: 'coal' as const },
        { level: -1, type: 'rubble' as const },
      ] as any[],
      miners: []
    };

    // Act & Assert: Throws error
    expect(() => placeMiner(plot, 1)).toThrow('No room to place miner');
  });

  test('placeMiner sets correct facing direction', () => {
    // Arrange: Create a plot with empty tile at index 0
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: []
    };

    // Act: Place miner
    const miner = placeMiner(plot, 1);

    // Assert: Facing direction set correctly
    expect(miner.facing).toBeDefined();
  });

  test('placeMiner handles plot with multiple empty tiles', () => {
    // Arrange: Create a plot with many empty tiles
    const plot = {
      tiles: Array.from({ length: 25 }, (_, i) => ({
        level: -(i % 5),
        type: 'empty' as const
      })) as any[],
      miners: []
    };

    // Act: Place miner
    const miner = placeMiner(plot, 1);

    // Assert: Miner placed at deepest empty tile
    expect(miner.tileIndex).toBe(4); // Deepest empty tile (level -4)
  });

  test('placeMiner handles plot with single empty tile', () => {
    // Arrange: Create a plot with single empty tile
    const plot = {
      tiles: [
        { level: 0, type: 'coal' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'rubble' as const },
      ] as any[],
      miners: []
    };

    // Act: Place miner
    const miner = placeMiner(plot, 1);

    // Assert: Miner placed at the only empty tile
    expect(miner.tileIndex).toBe(1);
  });

  test('placeMiner handles plot with no miners initially', () => {
    // Arrange: Create a plot with no miners
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: []
    };

    // Act: Place miner
    const miner = placeMiner(plot, 1);

    // Assert: Miner added to plot
    expect(miner.tileIndex).toBe(0);
  });

  test('placeMiner handles plot with existing miners', () => {
    // Arrange: Create a plot with existing miner
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [{ tileIndex: 0, level: 1, facing: 0 } as any]
    };

    // Act: Place second miner
    const miner = placeMiner(plot, 2);

    // Assert: Second miner placed at next best location
    expect(miner.tileIndex).toBe(1);
  });

  test('placeMiner handles plot with all tiles occupied', () => {
    // Arrange: Create a plot with all tiles occupied
    const plot = {
      tiles: Array.from({ length: 25 }, (_, i) => ({
        level: -(i % 5),
        type: 'coal' as const
      })) as any[],
      miners: []
    };

    // Act & Assert: Throws error
    expect(() => placeMiner(plot, 1)).toThrow('No room to place miner');
  });
});

describe('Mines - Facing Direction', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('getFacingDirection returns correct direction for tile at index 0', () => {
    // Act: Get facing direction
    const direction = getDirection(0);

    // Assert: Faces right (0 degrees)
    expect(direction).toBe(0);
  });

  test('getFacingDirection returns correct direction for tile at index 1', () => {
    // Act: Get facing direction
    const direction = getDirection(1);

    // Assert: Faces right (0 degrees)
    expect(direction).toBe(0);
  });

  test('getFacingDirection returns correct direction for tile at index 2', () => {
    // Act: Get facing direction
    const direction = getDirection(2);

    // Assert: Faces down (90 degrees)
    expect(direction).toBe(90);
  });

  test('getFacingDirection returns correct direction for tile at index 3', () => {
    // Act: Get facing direction
    const direction = getDirection(3);

    // Assert: Faces down (90 degrees)
    expect(direction).toBe(90);
  });

  test('getFacingDirection returns correct direction for tile at index 4', () => {
    // Act: Get facing direction
    const direction = getDirection(4);

    // Assert: Faces up (270 degrees)
    expect(direction).toBe(270);
  });

  test('getFacingDirection returns correct direction for tile at index 5', () => {
    // Act: Get facing direction
    const direction = getDirection(5);

    // Assert: Faces up (270 degrees)
    expect(direction).toBe(270);
  });

  test('getFacingDirection returns correct direction for tile at index 6', () => {
    // Act: Get facing direction
    const direction = getDirection(6);

    // Assert: Faces right (0 degrees)
    expect(direction).toBe(0);
  });

  test('getFacingDirection alternates directions in grid pattern', () => {
    // Arrange: Check multiple tiles
    const directions = [];
    for (let i = 0; i < 25; i++) {
      directions.push(getDirection(i));
    }

    // Assert: Directions follow expected pattern
    expect(directions[0]).toBe(0);   // right
    expect(directions[4]).toBe(270); // up
    expect(directions[5]).toBe(270); // up
    expect(directions[9]).toBe(0);   // right
  });

  test('getFacingDirection handles edge of grid', () => {
    // Act: Get directions at grid edges
    const topRow = getDirection(0);
    const bottomRow = getTileFacing(24);

    // Assert: Top row faces down, bottom row faces up
    expect(topRow).toBe(90);
    expect(bottomRow).toBe(270);
  });

  test('getFacingDirection handles center of grid', () => {
    // Act: Get direction at center
    const center = getDirection(12);

    // Assert: Center tiles face down
    expect(center).toBe(90);
  });

  test('getFacingDirection returns consistent values', () => {
    // Act: Call multiple times
    const dir1 = getDirection(5);
    const dir2 = getTileFacing(5);

    // Assert: Consistent results
    expect(dir1).toBe(dir2);
  });

  test('getFacingDirection handles negative indices', () => {
    // Act: Get direction for negative index
    const direction = getDirection(-1) as any;

    // Assert: Handles gracefully (wraps around or returns default)
    expect(typeof direction).toBe('number');
  });

  test('getFacingDirection handles large indices', () => {
    // Act: Get direction for large index
    const direction = getDirection(100);

    // Assert: Returns valid direction
    expect([0, 90, 180, 270].includes(direction)).toBe(true);
  });
});

describe('Mines - Neighbor Detection', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('getNeighbors returns correct neighbors for tile at index 0', () => {
    // Act: Get neighbors
    const neighbors = getNeighbors(0);

    // Assert: Neighbors are right and down (indices 1 and 5)
    expect(neighbors).toContain(1);
    expect(neighbors).toContain(5);
    expect(neighbors.length).toBe(2);
  });

  test('getNeighbors returns correct neighbors for tile at index 4', () => {
    // Act: Get neighbors
    const neighbors = getNeighbors(4);

    // Assert: Neighbors are left, up, right (indices 3, -1 wraps to 24, 9)
    expect(neighbors).toContain(3);
    expect(neighbors).toContain(9);
    expect(neighbors.length).toBe(2); // Only right and down available
  });

  test('getNeighbors returns correct neighbors for tile at index 5', () => {
    // Act: Get neighbors
    const neighbors = getNeighbors(5);

    // Assert: Neighbors are left, up, right (indices 4, 0, 10)
    expect(neighbors).toContain(4);
    expect(neighbors).toContain(0);
    expect(neighbors).toContain(10);
    expect(neighbors.length).toBe(3);
  });

  test('getNeighbors returns correct neighbors for tile at index 9', () => {
    // Act: Get neighbors
    const neighbors = getNeighbors(9);

    // Assert: Neighbors are up, left, right (indices 4, 8, 10)
    expect(neighbors).toContain(4);
    expect(neighbors).toContain(8);
    expect(neighbors).toContain(10);
    expect(neighbors.length).toBe(3);
  });

  test('getNeighbors handles corner tiles', () => {
    // Act: Get neighbors for all corners
    const topLeft = getNeighbors(0);
    const topRight = getNeighbors(4);
    const bottomLeft = getNeighbors(20);
    const bottomRight = getNeighbors(24);

    // Assert: Corners have fewer neighbors
    expect(topLeft.length).toBeLessThan(4);
    expect(topRight.length).toBeLessThan(4);
    expect(bottomLeft.length).toBeLessThan(4);
    expect(bottomRight.length).toBeLessThan(4);
  });

  test('getNeighbors handles edge tiles', () => {
    // Act: Get neighbors for edge tiles
    const topEdge = getNeighbors(0);
    const bottomEdge = getNeighbors(24);
    const leftEdge = getNeighbors(0);
    const rightEdge = getNeighbors(4);

    // Assert: Edge tiles have fewer neighbors
    expect(topEdge.length).toBeLessThan(4);
    expect(bottomEdge.length).toBeLessThan(4);
  });

  test('getNeighbors handles center tiles', () => {
    // Act: Get neighbors for center tiles
    const center1 = getNeighbors(9);
    const center2 = getNeighbors(10);
    const center3 = getNeighbors(14);

    // Assert: Center tiles have 4 neighbors
    expect(center1.length).toBe(4);
    expect(center2.length).toBe(4);
    expect(center3.length).toBe(4);
  });

  test('getNeighbors returns neighbors in consistent order', () => {
    // Act: Get neighbors multiple times
    const neighbors1 = getNeighbors(9);
    const neighbors2 = getNeighbors(9);

    // Assert: Consistent order
    expect(neighbors1).toEqual(neighbors2);
  });

  test('getNeighbors handles tile with all directions available', () => {
    // Act: Get neighbors for center tile
    const neighbors = getNeighbors(10);

    // Assert: Has all 4 directions
    expect(neighbors.length).toBe(4);
    expect(neighbors).toContain(9);   // left
    expect(neighbors).toContain(11);  // right
    expect(neighbors).toContain(5);   // up
    expect(neighbors).toContain(15);  // down
  });

  test('getNeighbors handles tile with no available neighbors', () => {
    // Act: This shouldn't happen in a 5x5 grid, but test anyway
    const neighbors = getNeighbors(24);

    // Assert: At least has left neighbor
    expect(neighbors.length).toBeGreaterThanOrEqual(1);
  });

  test('getNeighbors handles wrap-around at edges', () => {
    // Act: Get neighbors for tile at right edge
    const neighbors = getNeighbors(4);

    // Assert: Doesn't include non-existent right neighbor
    expect(neighbors).not.toContain(5);
  });

  test('getNeighbors handles grid boundaries correctly', () => {
    // Act: Get neighbors for all tiles
    const allNeighbors = [];
    for (let i = 0; i < 25; i++) {
      allNeighbors.push(getNeighbors(i));
    }

    // Assert: All have valid neighbor arrays
    for (const neighbors of allNeighbors) {
      expect(Array.isArray(neighbors)).toBe(true);
      expect(neighbors.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('Mines - Miner Merge', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('attemptMerge succeeds when same-level miner exists on adjacent tile', () => {
    // Arrange: Create a plot with two miners at same level
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 1, level: 1, facing: 90 } as any,
      ]
    };

    // Act: Attempt merge
    const success = attemptMerge(plot, plot.miners[0]);

    // Assert: Merge successful
    expect(success).toBe(true);
    expect(plot.miners.length).toBe(1); // Both miners merged into one
  });

  test('attemptMerge fails when no adjacent miner at same level', () => {
    // Arrange: Create a plot with miners at different levels
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 1, level: 2, facing: 90 } as any, // Different level
      ]
    };

    // Act: Attempt merge
    const success = attemptMerge(plot, plot.miners[0]);

    // Assert: Merge failed
    expect(success).toBe(false);
    expect(plot.miners.length).toBe(2); // Miners not merged
  });

  test('attemptMerge upgrades miner level on successful merge', () => {
    // Arrange: Create a plot with two miners at same level
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 1, level: 1, facing: 90 } as any,
      ]
    };

    // Act: Attempt merge
    attemptMerge(plot, plot.miners[0]);

    // Assert: Miner upgraded
    expect(plot.miners[0].level).toBe(2);
  });

  test('attemptMerge removes both miners on successful merge', () => {
    // Arrange: Create a plot with two miners at same level
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 1, level: 1, facing: 90 } as any,
      ]
    };

    // Act: Attempt merge
    attemptMerge(plot, plot.miners[0]);

    // Assert: Both miners removed (merged into one)
    expect(plot.miners.length).toBe(1);
  });

  test('attemptMerge handles plot with single miner', () => {
    // Arrange: Create a plot with single miner
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
      ]
    };

    // Act: Attempt merge
    const success = attemptMerge(plot, plot.miners[0]);

    // Assert: Merge failed (no other miner to merge with)
    expect(success).toBe(false);
    expect(plot.miners.length).toBe(1);
  });

  test('attemptMerge handles plot with no miners', () => {
    // Arrange: Create a plot with no miners
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: []
    };

    // Act & Assert: Throws error (no miner to merge)
    expect(() => attemptMerge(plot, {} as any)).toThrow();
  });

  test('attemptMerge handles plot with adjacent but different-level miners', () => {
    // Arrange: Create a plot with adjacent miners at different levels
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 1, level: 2, facing: 90 } as any, // Different level
      ]
    };

    // Act: Attempt merge
    const success = attemptMerge(plot, plot.miners[0]);

    // Assert: Merge failed (different levels)
    expect(success).toBe(false);
  });

  test('attemptMerge handles non-adjacent miners', () => {
    // Arrange: Create a plot with non-adjacent miners
    const plot = {
      tiles: Array.from({ length: 25 }, (_, i) => ({
        level: -(i % 5),
        type: 'empty' as const
      })) as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 10, level: 1, facing: 90 } as any, // Not adjacent
      ]
    };

    // Act: Attempt merge
    const success = attemptMerge(plot, plot.miners[0]);

    // Assert: Merge failed (not adjacent)
    expect(success).toBe(false);
  });
});

describe('Mines - Miner Purchase', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('buyMiner places miner when money sufficient', () => {
    // Arrange: Create a plot with enough money
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [],
      money: 1000
    };

    // Act: Buy miner
    const miner = buyMiner(plot);

    // Assert: Miner placed and money deducted
    expect(miner.tileIndex).toBe(0);
    expect(miner.level).toBe(1);
    expect(plot.money).toBeLessThan(1000);
  });

  test('buyMiner throws error when insufficient money', () => {
    // Arrange: Create a plot with insufficient money
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [],
      money: 100
    };

    // Act & Assert: Throws error
    expect(() => buyMiner(plot)).toThrow('Not enough money');
  });

  test('buyMiner calculates correct cost for first miner', () => {
    // Arrange: Create a plot with no miners
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [],
      money: 1000
    };

    // Act: Buy first miner
    buyMiner(plot);

    // Assert: Cost is 50 for first miner (50 * 1.5^0)
    expect(plot.money).toBe(950); // 1000 - 50
  });

  test('buyMiner calculates correct cost for second miner', () => {
    // Arrange: Create a plot with one miner
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [{ tileIndex: 0, level: 1, facing: 0 } as any],
      money: 1000
    };

    // Act: Buy second miner
    buyMiner(plot);

    // Assert: Cost is 75 for second miner (50 * 1.5^1)
    expect(plot.money).toBe(925); // 1000 - 75
  });

  test('buyMiner calculates correct cost for third miner', () => {
    // Arrange: Create a plot with two miners
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 1, level: 1, facing: 90 } as any,
      ],
      money: 1000
    };

    // Act: Buy third miner
    buyMiner(plot);

    // Assert: Cost is 112.5 for third miner (50 * 1.5^2)
    expect(plot.money).toBe(887.5); // 1000 - 112.5
  });

  test('buyMiner handles exact money amount', () => {
    // Arrange: Create a plot with exact amount needed
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [],
      money: 50
    };

    // Act: Buy miner
    buyMiner(plot);

    // Assert: Money exactly zeroed
    expect(plot.money).toBe(0);
  });

  test('buyMiner handles money just below cost', () => {
    // Arrange: Create a plot with almost enough money
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [],
      money: 49.99
    };

    // Act & Assert: Throws error
    expect(() => buyMiner(plot)).toThrow('Not enough money');
  });

  test('buyMiner handles plot with no empty tiles', () => {
    // Arrange: Create a plot with no empty tiles
    const plot = {
      tiles: [
        { level: 0, type: 'coal' as const },
        { level: -1, type: 'rubble' as const },
      ] as any[],
      miners: [],
      money: 1000
    };

    // Act & Assert: Throws error (no room to place miner)
    expect(() => buyMiner(plot)).toThrow('No room to place miner');
  });

  test('buyMiner handles plot with all tiles occupied', () => {
    // Arrange: Create a plot with all tiles occupied
    const plot = {
      tiles: Array.from({ length: 25 }, (_, i) => ({
        level: -(i % 5),
        type: 'coal' as const
      })) as any[],
      miners: [],
      money: 1000
    };

    // Act & Assert: Throws error (no room to place miner)
    expect(() => buyMiner(plot)).toThrow('No room to place miner');
  });

  test('buyMiner handles plot with many existing miners', () => {
    // Arrange: Create a plot with many miners
    const plot = {
      tiles: Array.from({ length: 25 }, (_, i) => ({
        level: -(i % 5),
        type: 'empty' as const
      })) as any[],
      miners: Array.from({ length: 10 }, (_, i) => ({
        tileIndex: i,
        level: 1 + Math.floor(i / 5),
        facing: 0
      })),
      money: 10000
    };

    // Act: Buy more miners
    buyMiner(plot);
    buyMiner(plot);

    // Assert: Miners added and money deducted
    expect(plot.miners.length).toBe(12);
    expect(plot.money).toBeLessThan(10000);
  });

  test('buyMiner handles plot with zero money initially', () => {
    // Arrange: Create a plot with zero money
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [],
      money: 0
    };

    // Act & Assert: Throws error (not enough money)
    expect(() => buyMiner(plot)).toThrow('Not enough money');
  });
});

describe('Mines - Miner Cost Calculation', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('calculateMinerCost returns correct cost for first miner', () => {
    // Act: Calculate cost
    const cost = calculateMinerCost(1);

    // Assert: First miner costs 50
    expect(cost).toBe(50);
  });

  test('calculateMinerCost returns correct cost for second miner', () => {
    // Act: Calculate cost
    const cost = calculateMinerCost(2);

    // Assert: Second miner costs 75 (50 * 1.5)
    expect(cost).toBe(75);
  });

  test('calculateMinerCost returns correct cost for third miner', () => {
    // Act: Calculate cost
    const cost = calculateMinerCost(3);

    // Assert: Third miner costs 112.5 (50 * 1.5^2)
    expect(cost).toBe(112.5);
  });

  test('calculateMinerCost returns correct cost for fourth miner', () => {
    // Act: Calculate cost
    const cost = calculateMinerCost(4);

    // Assert: Fourth miner costs 168.75 (50 * 1.5^3)
    expect(cost).toBe(168.75);
  });

  test('calculateMinerCost returns correct cost for fifth miner', () => {
    // Act: Calculate cost
    const cost = calculateMinerCost(5);

    // Assert: Fifth miner costs 253.125 (50 * 1.5^4)
    expect(cost).toBe(253.125);
  });

  test('calculateMinerCost follows exponential growth pattern', () => {
    // Act: Calculate multiple costs
    const costs = [];
    for (let i = 1; i <= 10; i++) {
      costs.push(calculateMinerCost(i));
    }

    // Assert: Each cost is 1.5x the previous
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeCloseTo(costs[i - 1] * 1.5, 1);
    }
  });

  test('calculateMinerCost handles large miner count', () => {
    // Act: Calculate cost for many miners
    const cost = calculateMinerCost(20);

    // Assert: Cost is high but calculable
    expect(cost).toBeGreaterThan(1000);
  });

  test('calculateMinerCost returns consistent values', () => {
    // Act: Call multiple times
    const cost1 = calculateMinerCost(5);
    const cost2 = calculateMinerCost(5);

    // Assert: Consistent results
    expect(cost1).toBe(cost2);
  });

  test('calculateMinerCost handles fractional costs', () => {
    // Act: Calculate cost
    const cost = calculateMinerCost(3);

    // Assert: Returns fractional value
    expect(typeof cost).toBe('number');
    expect(cost).toBe(112.5);
  });

  test('calculateMinerCost starts at base cost', () => {
    // Act: Calculate first miner cost
    const cost = calculateMinerCost(1);

    // Assert: Base cost is 50
    expect(cost).toBe(50);
  });

  test('calculateMinerCost grows exponentially', () => {
    // Arrange: Calculate costs for sequence
    const costs = [
      calculateMinerCost(1),
      calculateMinerCost(2),
      calculateMinerCost(3),
      calculateMinerCost(4),
    ];

    // Assert: Exponential growth (each is 1.5x previous)
    expect(costs[1]).toBe(costs[0] * 1.5);
    expect(costs[2]).toBe(costs[1] * 1.5);
    expect(costs[3]).toBe(costs[2] * 1.5);
  });

  test('calculateMinerCost handles zero miners', () => {
    // Act: Calculate cost for zero miners (edge case)
    const cost = calculateMinerCost(0) as any;

    // Assert: Returns base cost anyway (first miner)
    expect(cost).toBe(50);
  });

  test('calculateMinerCost handles negative miners', () => {
    // Act: Calculate cost for negative miners (edge case)
    const cost = calculateMinerCost(-1) as any;

    // Assert: Returns base cost anyway
    expect(cost).toBe(50);
  });
});

describe('Mines - Miner Operations Integration', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('can purchase multiple miners with sufficient funds', () => {
    // Arrange: Create a plot with lots of money
    const plot = {
      tiles: Array.from({ length: 25 }, (_, i) => ({
        level: -(i % 5),
        type: 'empty' as const
      })) as any[],
      miners: [],
      money: 10000
    };

    // Act: Purchase multiple miners
    buyMiner(plot);
    buyMiner(plot);
    buyMiner(plot);

    // Assert: Three miners purchased
    expect(plot.miners.length).toBe(3);
    expect(plot.money).toBeLessThan(10000);
  });

  test('can merge miners to upgrade', () => {
    // Arrange: Create a plot with two adjacent miners at same level
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 1, level: 1, facing: 90 } as any,
      ],
      money: 500
    };

    // Act: Merge miners
    attemptMerge(plot, plot.miners[0]);

    // Assert: Miners merged and upgraded
    expect(plot.miners.length).toBe(1);
    expect(plot.miners[0].level).toBe(2);
  });

  test('can purchase miner after merge', () => {
    // Arrange: Create a plot with one miner
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [{ tileIndex: 0, level: 2, facing: 0 } as any],
      money: 1000
    };

    // Act: Purchase second miner
    buyMiner(plot);

    // Assert: Second miner purchased
    expect(plot.miners.length).toBe(2);
  });

  test('can find best placement for new miner', () => {
    // Arrange: Create a plot with some miners
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
        { level: -2, type: 'empty' as const },
      ] as any[],
      miners: [{ tileIndex: 0, level: 1, facing: 0 } as any],
      money: 1000
    };

    // Act: Find best placement
    const bestIndex = findBestMinerPlacement(plot);

    // Assert: Best placement is at deepest empty tile
    expect(bestIndex).toBe(2);
  });

  test('can get facing direction for miner placement', () => {
    // Arrange: Create a plot with empty tile at index 0
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: []
    };

    // Act: Get facing direction
    const bestIndex = findBestMinerPlacement(plot);
    if (bestIndex !== null) {
      const direction = getDirection(bestIndex);

      // Assert: Direction is valid
      expect([0, 90, 180, 270].includes(direction)).toBe(true);
    }
  });

  test('can get neighbors for merge targeting', () => {
    // Arrange: Create a plot with miner at index 9
    const plot = {
      tiles: Array.from({ length: 25 }, (_, i) => ({
        level: -(i % 5),
        type: 'empty' as const
      })) as any[],
      miners: [{ tileIndex: 9, level: 1, facing: 0 } as any],
      money: 500
    };

    // Act: Get neighbors
    const neighbors = getNeighbors(9);

    // Assert: Has valid neighbors
    expect(neighbors.length).toBe(4);
  });

  test('can calculate cost before purchasing', () => {
    // Arrange: Create a plot with some miners
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [{ tileIndex: 0, level: 1, facing: 0 } as any],
      money: 1000
    };

    // Act: Calculate cost
    const cost = calculateMinerCost(plot.miners.length + 1);

    // Assert: Cost is correct for next miner
    expect(cost).toBe(75); // Second miner costs 75
  });

  test('can plan miner placement strategy', () => {
    // Arrange: Create a plot with partial tiles
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
        { level: -3, type: 'rubble' as const },
      ] as any[],
      miners: [],
      money: 1000
    };

    // Act: Plan placement
    const bestIndex = findBestMinerPlacement(plot);
    if (bestIndex !== null) {
      const direction = getDirection(bestIndex);
      const neighbors = getNeighbors(bestIndex);

      // Assert: Can plan placement
      expect(bestIndex).toBe(1); // Deepest empty tile
      expect(direction).toBeDefined();
      expect(neighbors.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('can execute full miner lifecycle', () => {
    // Arrange: Create a plot
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'coal' as const },
      ] as any[],
      miners: [],
      money: 1500
    };

    // Act: Purchase miner
    const miner = buyMiner(plot);

    // Assert: Miner purchased
    expect(miner.tileIndex).toBe(0);
    expect(miner.level).toBe(1);

    // Act: Find best placement for second miner
    const bestIndex = findBestMinerPlacement(plot);
    if (bestIndex !== null) {
      // Act: Place second miner
      const secondMiner = placeMiner(plot, 2);

      // Assert: Second miner placed
      expect(secondMiner.tileIndex).toBe(1);
    }
  });

  test('can merge and continue mining', () => {
    // Arrange: Create a plot with two miners
    const plot = {
      tiles: [
        { level: 0, type: 'empty' as const },
        { level: -1, type: 'empty' as const },
        { level: -2, type: 'coal' as const },
      ] as any[],
      miners: [
        { tileIndex: 0, level: 1, facing: 0 } as any,
        { tileIndex: 1, level: 1, facing: 90 } as any,
      ],
      money: 500
    };

    // Act: Merge miners
    attemptMerge(plot, plot.miners[0]);

    // Assert: Miners merged
    expect(plot.miners.length).toBe(1);
    expect(plot.miners[0].level).toBe(2);

    // Act: Can continue mining with upgraded miner
    const bestIndex = findBestMinerPlacement(plot);
    if (bestIndex !== null) {
      placeMiner(plot, 3);
    }

    // Assert: Can place more miners after merge
    expect(plot.miners.length).toBe(2);
  });
});
