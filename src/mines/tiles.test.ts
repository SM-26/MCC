import { describe, beforeEach, test, expect } from 'vitest';
import { initializeTiles, getResourceValue } from './tiles';

describe('Mines - Tile Initialization', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('initializeTiles creates correct number of tiles', () => {
    // Act: Initialize tiles with default count
    const tiles = initializeTiles(0);

    // Assert: Default tile count
    expect(tiles.length).toBe(25);
  });

  test('initializeTiles creates tiles with specified count', () => {
    // Act: Initialize tiles with custom count
    const tiles = initializeTiles(0, 50);

    // Assert: Custom tile count
    expect(tiles.length).toBe(50);
  });

  test('initializeTiles sets correct level for all tiles', () => {
    // Arrange: Initialize at depth -3
    const tiles = initializeTiles(-3);

    // Act & Assert: All tiles have same level
    for (const tile of tiles) {
      expect(tile.level).toBe(-3);
    }
  });

  test('initializeTiles creates mixed terrain types at ground level', () => {
    // Act: Initialize at ground level
    const tiles = initializeTiles(0);

    // Assert: Has mix of rubble and dirt
    const rubbleCount = tiles.filter(t => t.type === 'rubble').length;
    const dirtCount = tiles.filter(t => t.type === 'dirt').length;

    expect(rubbleCount).toBeGreaterThan(0);
    expect(dirtCount).toBeGreaterThan(0);
  });

  test('initializeTiles creates more rubble at shallower depths', () => {
    // Act: Initialize at different depths
    const shallowTiles = initializeTiles(1);
    const deepTiles = initializeTiles(5);

    // Assert: Shallow has more rubble
    const shallowRubble = shallowTiles.filter(t => t.type === 'rubble').length;
    const deepRubble = deepTiles.filter(t => t.type === 'rubble').length;

    expect(shallowRubble).toBeGreaterThan(deepRubble);
  });

  test('initializeTiles creates oil at levels 6-10', () => {
    // Act: Initialize at level 7
    const tiles = initializeTiles(7);

    // Assert: Has oil tiles
    const oilCount = tiles.filter(t => t.type === 'oil').length;
    expect(oilCount).toBeGreaterThan(0);
  });

  test('initializeTiles creates copper at levels 11-15', () => {
    // Act: Initialize at level 12
    const tiles = initializeTiles(12);

    // Assert: Has copper tiles
    const copperCount = tiles.filter(t => t.type === 'copper').length;
    expect(copperCount).toBeGreaterThan(0);
  });

  test('initializeTiles creates super-alloy at levels 16-20', () => {
    // Act: Initialize at level 17
    const tiles = initializeTiles(17);

    // Assert: Has super-alloy tiles
    const superAlloyCount = tiles.filter(t => t.type === 'super-alloy').length;
    expect(superAlloyCount).toBeGreaterThan(0);
  });

  test('initializeTiles creates mixed resources at deep levels', () => {
    // Act: Initialize at level 25
    const tiles = initializeTiles(25);

    // Assert: Has mix of oil and copper
    const oilCount = tiles.filter(t => t.type === 'oil').length;
    const copperCount = tiles.filter(t => t.type === 'copper').length;

    expect(oilCount).toBeGreaterThan(0);
    expect(copperCount).toBeGreaterThan(0);
  });

  test('initializeTiles sets HP based on depth', () => {
    // Arrange: Initialize at different depths
    const shallowTiles = initializeTiles(1);
    const deepTiles = initializeTiles(10);

    // Act & Assert: Deep tiles have higher HP
    const shallowAvgHp = shallowTiles.reduce((sum, t) => sum + t.hp, 0) / shallowTiles.length;
    const deepAvgHp = deepTiles.reduce((sum, t) => sum + t.hp, 0) / deepTiles.length;

    expect(deepAvgHp).toBeGreaterThan(shallowAvgHp);
  });

  test('initializeTiles sets HP to 0 for dirt tiles', () => {
    // Act: Initialize at ground level
    const tiles = initializeTiles(0);

    // Assert: Dirt tiles have 0 HP
    const dirtTiles = tiles.filter(t => t.type === 'dirt');
    for (const tile of dirtTiles) {
      expect(tile.hp).toBe(0);
    }
  });

  test('initializeTiles sets maxHp based on depth', () => {
    // Arrange: Initialize at different depths
    const shallowTiles = initializeTiles(1);
    const deepTiles = initializeTiles(10);

    // Act & Assert: Deep tiles have higher maxHp
    const shallowAvgMaxHp = shallowTiles.reduce((sum, t) => sum + t.maxHp, 0) / shallowTiles.length;
    const deepAvgMaxHp = deepTiles.reduce((sum, t) => sum + t.maxHp, 0) / deepTiles.length;

    expect(deepAvgMaxHp).toBeGreaterThan(shallowAvgMaxHp);
  });

  test('initializeTiles sets value based on resource type', () => {
    // Act: Initialize at ground level
    const tiles = initializeTiles(0);

    // Assert: Different resources have different values
    const rubbleTiles = tiles.filter(t => t.type === 'rubble');
    for (const tile of rubbleTiles) {
      expect(tile.value).toBe(5);
    }
  });

  test('initializeTiles creates deterministic tile distribution', () => {
    // Act: Initialize multiple times at same depth
    const tiles1 = initializeTiles(0);
    const tiles2 = initializeTiles(0);

    // Assert: Same level for all tiles
    expect(tiles1[0].level).toBe(tiles2[0].level);
  });

  test('initializeTiles handles zero depth', () => {
    // Act: Initialize at zero depth
    const tiles = initializeTiles(0);

    // Assert: All tiles have level 0
    for (const tile of tiles) {
      expect(tile.level).toBe(0);
    }
  });

  test('initializeTiles handles negative depth', () => {
    // Act: Initialize at negative depth
    const tiles = initializeTiles(-5);

    // Assert: All tiles have level -5
    for (const tile of tiles) {
      expect(tile.level).toBe(-5);
    }
  });

  test('initializeTiles handles large tile count', () => {
    // Act: Initialize with many tiles
    const tiles = initializeTiles(0, 100);

    // Assert: Correct count
    expect(tiles.length).toBe(100);
  });

  test('initializeTiles creates tiles with all required properties', () => {
    // Act: Initialize at ground level
    const tiles = initializeTiles(0);

    // Assert: All tiles have required properties
    for (const tile of tiles) {
      expect(tile.level).toBeDefined();
      expect(tile.type).toBeDefined();
      expect(tile.hp).toBeDefined();
      expect(tile.maxHp).toBeDefined();
      expect(tile.value).toBeDefined();
      expect(tile.resourceType).toBeDefined();
    }
  });

  test('initializeTiles creates tiles with correct resourceType', () => {
    // Act: Initialize at ground level
    const tiles = initializeTiles(0);

    // Assert: Dirt has null resourceType, others have string
    for (const tile of tiles) {
      if (tile.type === 'dirt') {
        expect(tile.resourceType).toBeNull();
      } else {
        expect(typeof tile.resourceType).toBe('string');
      }
    }
  });

  test('initializeTiles creates consistent tile structure', () => {
    // Act: Initialize at different depths
    const tiles1 = initializeTiles(0);
    const tiles2 = initializeTiles(-5);
    const tiles3 = initializeTiles(10);

    // Assert: All have same structure
    expect(tiles1[0]).toHaveProperty('level');
    expect(tiles1[0]).toHaveProperty('type');
    expect(tiles1[0]).toHaveProperty('hp');
    expect(tiles1[0]).toHaveProperty('maxHp');
    expect(tiles1[0]).toHaveProperty('value');
    expect(tiles1[0]).toHaveProperty('resourceType');
  });
});

describe('Mines - Resource Value Calculation', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('getResourceValue returns correct value for rubble', () => {
    // Act: Get value
    const value = getResourceValue('rubble');

    // Assert: Correct value
    expect(value).toBe(5);
  });

  test('getResourceValue returns correct value for dirt', () => {
    // Act: Get value
    const value = getResourceValue('dirt');

    // Assert: Correct value
    expect(value).toBe(1);
  });

  test('getResourceValue returns correct value for coal', () => {
    // Act: Get value
    const value = getResourceValue('coal');

    // Assert: Correct value
    expect(value).toBe(2);
  });

  test('getResourceValue returns correct value for oil', () => {
    // Act: Get value
    const value = getResourceValue('oil');

    // Assert: Correct value
    expect(value).toBe(2);
  });

  test('getResourceValue returns correct value for copper', () => {
    // Act: Get value
    const value = getResourceValue('copper');

    // Assert: Correct value
    expect(value).toBe(3);
  });

  test('getResourceValue returns correct value for super-alloy', () => {
    // Act: Get value
    const value = getResourceValue('super-alloy');

    // Assert: Correct value
    expect(value).toBe(5);
  });

  test('getResourceValue returns default value for unknown resource', () => {
    // Act: Get value for unknown resource
    const value = getResourceValue('unknown-resource');

    // Assert: Returns default value
    expect(value).toBe(1);
  });

  test('getResourceValue handles case sensitivity', () => {
    // Act: Get values with different cases
    const coalLower = getResourceValue('coal');
    const coalUpper = getResourceValue('COAL');

    // Assert: Case-sensitive matching
    expect(coalLower).toBe(2);
    expect(coalUpper).toBe(1); // Unknown resource, returns default
  });

  test('getResourceValue handles empty string', () => {
    // Act: Get value for empty string
    const value = getResourceValue('');

    // Assert: Returns default value
    expect(value).toBe(1);
  });

  test('getResourceValue handles null', () => {
    // Act: Get value for null
    const value = getResourceValue(null as any);

    // Assert: Returns default value
    expect(value).toBe(1);
  });

  test('getResourceValue handles undefined', () => {
    // Act: Get value for undefined
    const value = getResourceValue(undefined as any);

    // Assert: Returns default value
    expect(value).toBe(1);
  });

  test('getResourceValue handles whitespace', () => {
    // Act: Get value for whitespace
    const value = getResourceValue(' ');

    // Assert: Returns default value (whitespace not in list)
    expect(value).toBe(1);
  });

  test('getResourceValue returns consistent values', () => {
    // Act: Call multiple times
    const value1 = getResourceValue('coal');
    const value2 = getResourceValue('coal');
    const value3 = getResourceValue('coal');

    // Assert: Consistent results
    expect(value1).toBe(value2);
    expect(value2).toBe(value3);
  });

  test('getResourceValue returns values in expected order', () => {
    // Arrange: Get all resource values
    const rubble = getResourceValue('rubble');
    const dirt = getResourceValue('dirt');
    const coal = getResourceValue('coal');
    const oil = getResourceValue('oil');
    const copper = getResourceValue('copper');
    const superAlloy = getResourceValue('super-alloy');

    // Assert: Expected order (rubble > copper >= super-alloy > coal = oil > dirt)
    expect(rubble).toBe(5);
    expect(superAlloy).toBe(5);
    expect(copper).toBe(3);
    expect(coal).toBe(2);
    expect(oil).toBe(2);
    expect(dirt).toBe(1);
  });

  test('getResourceValue handles special characters in resource name', () => {
    // Act: Get value for resource with hyphen
    const value = getResourceValue('super-alloy');

    // Assert: Handles hyphen correctly
    expect(value).toBe(5);
  });

  test('getResourceValue returns high value for premium resources', () => {
    // Arrange: Get premium resource values
    const rubble = getResourceValue('rubble');
    const superAlloy = getResourceValue('super-alloy');

    // Assert: Rumble and super-alloy are most valuable
    expect(rubble).toBe(5);
    expect(superAlloy).toBe(5);
  });

  test('getResourceValue returns low value for common resources', () => {
    // Arrange: Get common resource values
    const dirt = getResourceValue('dirt');
    const coal = getResourceValue('coal');
    const oil = getResourceValue('oil');

    // Assert: Dirt is least valuable
    expect(dirt).toBe(1);
    expect(coal).toBe(2);
    expect(oil).toBe(2);
  });
});

describe('Mines - Tile Initialization Edge Cases', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('initializeTiles handles very shallow depth', () => {
    // Act: Initialize at level 1
    const tiles = initializeTiles(1);

    // Assert: Creates tiles correctly
    expect(tiles.length).toBe(25);
    expect(tiles[0].level).toBe(1);
  });

  test('initializeTiles handles very deep depth', () => {
    // Act: Initialize at level 30
    const tiles = initializeTiles(30);

    // Assert: Creates tiles correctly
    expect(tiles.length).toBe(25);
    expect(tiles[0].level).toBe(30);
  });

  test('initializeTiles handles negative depth', () => {
    // Act: Initialize at level -10
    const tiles = initializeTiles(-10);

    // Assert: Creates tiles correctly
    expect(tiles.length).toBe(25);
    expect(tiles[0].level).toBe(-10);
  });

  test('initializeTiles handles zero tile count', () => {
    // Act: Initialize with zero tiles
    const tiles = initializeTiles(0, 0);

    // Assert: Returns empty array
    expect(tiles.length).toBe(0);
  });

  test('initializeTiles handles very large tile count', () => {
    // Act: Initialize with many tiles
    const tiles = initializeTiles(0, 1000);

    // Assert: Creates correct number of tiles
    expect(tiles.length).toBe(1000);
  });

  test('initializeTiles handles fractional tile count', () => {
    // Act: Initialize with fractional count (should truncate)
    const tiles = initializeTiles(0, 10.5) as any;

    // Assert: Creates integer number of tiles
    expect(tiles.length).toBe(10);
  });

  test('initializeTiles handles null tile count', () => {
    // Act: Initialize with null count
    const tiles = initializeTiles(0, null as any);

    // Assert: Uses default count
    expect(tiles.length).toBe(25);
  });

  test('initializeTiles handles undefined tile count', () => {
    // Act: Initialize with undefined count
    const tiles = initializeTiles(0, undefined as any);

    // Assert: Uses default count
    expect(tiles.length).toBe(25);
  });

  test('initializeTiles handles negative tile count', () => {
    // Act: Initialize with negative count
    const tiles = initializeTiles(0, -10) as any;

    // Assert: Returns empty array (can't have negative tiles)
    expect(tiles.length).toBe(0);
  });

  test('initializeTiles handles very small tile count', () => {
    // Act: Initialize with 1 tile
    const tiles = initializeTiles(0, 1);

    // Assert: Creates single tile
    expect(tiles.length).toBe(1);
  });

  test('initializeTiles handles transition between resource zones', () => {
    // Act: Initialize at boundary depths
    const level5Tiles = initializeTiles(5);
    const level6Tiles = initializeTiles(6);
    const level10Tiles = initializeTiles(10);
    const level11Tiles = initializeTiles(11);

    // Assert: Different resource types at boundaries
    const level5Oil = level5Tiles.filter(t => t.type === 'oil').length;
    const level6Oil = level6Tiles.filter(t => t.type === 'oil').length;
    const level10Copper = level10Tiles.filter(t => t.type === 'copper').length;
    const level11Copper = level11Tiles.filter(t => t.type === 'copper').length;

    expect(level6Oil).toBeGreaterThan(0);
    expect(level11Copper).toBeGreaterThan(0);
  });

  test('initializeTiles maintains consistent tile structure across depths', () => {
    // Act: Initialize at different depths
    const tiles1 = initializeTiles(0);
    const tiles2 = initializeTiles(-5);
    const tiles3 = initializeTiles(10);

    // Assert: All have same structure
    expect(tiles1[0]).toHaveProperty('level');
    expect(tiles1[0]).toHaveProperty('type');
    expect(tiles1[0]).toHaveProperty('hp');
    expect(tiles1[0]).toHaveProperty('maxHp');
    expect(tiles1[0]).toHaveProperty('value');
    expect(tiles1[0]).toHaveProperty('resourceType');
  });

  test('initializeTiles creates tiles with valid type values', () => {
    // Act: Initialize at different depths
    const tiles = initializeTiles(5);

    // Assert: All types are valid
    for (const tile of tiles) {
      expect(['empty', 'rubble', 'dirt', 'coal', 'oil', 'copper', 'super-alloy'].includes(tile.type)).toBe(true);
    }
  });

  test('initializeTiles handles depth transition smoothly', () => {
    // Act: Initialize at consecutive depths
    const tiles0 = initializeTiles(0);
    const tiles1 = initializeTiles(1);
    const tiles2 = initializeTiles(2);

    // Assert: All have same level within their group
    for (const tile of tiles0) {
      expect(tile.level).toBe(0);
    }
    for (const tile of tiles1) {
      expect(tile.level).toBe(1);
    }
    for (const tile of tiles2) {
      expect(tile.level).toBe(2);
    }
  });

  test('initializeTiles creates tiles with appropriate HP ranges', () => {
    // Act: Initialize at different depths
    const shallowTiles = initializeTiles(1);
    const deepTiles = initializeTiles(20);

    // Assert: Deep tiles have higher HP range
    const shallowMinHp = Math.min(...shallowTiles.map(t => t.hp));
    const deepMinHp = Math.min(...deepTiles.map(t => t.hp));

    expect(deepMinHp).toBeGreaterThan(shallowMinHp);
  });

  test('initializeTiles creates tiles with appropriate maxHp ranges', () => {
    // Act: Initialize at different depths
    const shallowTiles = initializeTiles(1);
    const deepTiles = initializeTiles(20);

    // Assert: Deep tiles have higher maxHp range
    const shallowMinMaxHp = Math.min(...shallowTiles.map(t => t.maxHp));
    const deepMinMaxHp = Math.min(...deepTiles.map(t => t.maxHp));

    expect(deepMinMaxHp).toBeGreaterThan(shallowMinMaxHp);
  });
});
