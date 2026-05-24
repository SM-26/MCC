import { describe, beforeEach, test, expect } from 'vitest';
import { PlotState, createPlot, digDown, buyNorthPlot, getPlotName, getTileTypeDisplay, getTileHealthBar } from '../../mines/index';

describe('Mines & Plot Progression - Core Functions', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('createPlot creates plot with correct structure', () => {
    // Act: Create a ground-level plot
    const plot = createPlot('plot-A-I-1', 0, 0);

    // Assert: Plot has correct structure
    expect(plot.id).toBe('plot-A-I-1');
    expect(plot.northExpansions).toBe(0);
    expect(plot.undergroundLevels).toBe(0);
    expect(plot.softCleared).toBe(false);
    expect(plot.hardCleared).toBe(false);
    expect(plot.ageResources.coal).toBe(0);
    expect(plot.ageResources.oil).toBe(0);
    expect(plot.ageResources.copper).toBe(0);
    expect(plot.ageResources.superAlloy).toBe(0);
    expect(plot.currentAge).toBe('basic');
    expect(plot.availableAges.length).toBe(1);
    expect(plot.availableAges[0]).toBe('basic');
    expect(plot.stationBuilt).toBe(false);
    expect(plot.stationId).toBeNull();
    expect(plot.tiles.length).toBe(0);
    expect(plot.miners.length).toBe(0);
  });

  test('createPlot creates plot at underground level', () => {
    // Act: Create a plot at level -2
    const plot = createPlot('plot-A-I-2', 1, -2);

    // Assert: Plot has correct structure
    expect(plot.undergroundLevels).toBe(-2);
    expect(plot.northExpansions).toBe(1);
  });

  test('digDown extends tiles to new level', () => {
    // Arrange: Create a plot
    const plot = createPlot('plot-A-I-3', 0, -1);

    // Act: Dig down
    digDown(plot);

    // Assert: Tiles initialized at new level
    expect(plot.tiles.length).toBe(25);
    expect(plot.undergroundLevels).toBe(-2);
  });

  test('buyNorthPlot adds new plot when money sufficient', () => {
    // Arrange: Create a plot with enough money
    const plot = createPlot('plot-A-I-4', 0, -1);
    plot.money = 1000;

    // Act: Buy north plot
    const success = buyNorthPlot(plot, 500);

    // Assert: Purchase successful
    expect(success).toBe(true);
    expect(plot.northExpansions).toBe(1);
    expect(plot.id).not.toBe('plot-A-I-4');
  });

  test('buyNorthPlot fails when insufficient money', () => {
    // Arrange: Create a plot with insufficient money
    const plot = createPlot('plot-A-I-5', 0, -1);
    plot.money = 200;

    // Act: Try to buy north plot
    const success = buyNorthPlot(plot, 500);

    // Assert: Purchase failed
    expect(success).toBe(false);
    expect(plot.northExpansions).toBe(0);
  });

  test('buyNorthPlot deducts money on success', () => {
    // Arrange: Create a plot with exact amount needed
    const plot = createPlot('plot-A-I-6', 0, -1);
    plot.money = 500;

    // Act: Buy north plot
    buyNorthPlot(plot, 500);

    // Assert: Money deducted
    expect(plot.money).toBe(0);
  });

  test('getPlotName returns correct name for ground level', () => {
    // Arrange: Create a plot
    const plot = createPlot('plot-A-I-7', 0, 0);

    // Act: Get name
    const name = getPlotName(plot);

    // Assert: Correct name format
    expect(name).toBe('Plot A I 1');
  });

  test('getPlotName returns correct name for underground level', () => {
    // Arrange: Create a plot at level -2
    const plot = createPlot('plot-A-I-8', 0, -2);

    // Act: Get name
    const name = getPlotName(plot);

    // Assert: Correct name format with depth indicator
    expect(name).toBe('Plot A I -2');
  });

  test('getPlotName returns correct name for north expansion', () => {
    // Arrange: Create a plot with north expansion
    const plot = createPlot('plot-A-I-9', 1, -1);

    // Act: Get name
    const name = getPlotName(plot);

    // Assert: Correct name format
    expect(name).toBe('Plot B I -1');
  });

  test('getTileTypeDisplay returns correct emoji for each type', () => {
    // Arrange: Create tiles of different types
    const tileTypes: Array<{type: string, expectedEmoji: string}> = [
      { type: 'empty', expectedEmoji: '' },
      { type: 'rubble', expectedEmoji: '⛏️' },
      { type: 'dirt', expectedEmoji: '🟤' },
      { type: 'coal', expectedEmoji: '⚫' },
      { type: 'oil', expectedEmoji: '🔴' },
      { type: 'copper', expectedEmoji: '🟠' },
      { type: 'super-alloy', expectedEmoji: '🟣' }
    ];

    // Act & Assert: Each type returns correct emoji
    for (const { type, expectedEmoji } of tileTypes) {
      const display = getTileTypeDisplay({ type, hp: 100, maxHp: 100 });
      expect(display).toBe(expectedEmoji);
    }
  });

  test('getTileHealthBar returns empty string when HP is 0', () => {
    // Arrange: Create a dead tile
    const tile = { type: 'coal', hp: 0, maxHp: 100 };

    // Act: Get health bar
    const healthBar = getTileHealthBar(tile);

    // Assert: Empty string for dead tile
    expect(healthBar).toBe('');
  });

  test('getTileHealthBar returns green bar when HP > 50%', () => {
    // Arrange: Create a healthy tile
    const tile = { type: 'coal', hp: 60, maxHp: 100 };

    // Act: Get health bar
    const healthBar = getTileHealthBar(tile);

    // Assert: Green color for healthy tile
    expect(healthBar).toContain('#4CAF50');
    expect(healthBar).toContain('width:60%');
  });

  test('getTileHealthBar returns orange bar when HP between 25-50%', () => {
    // Arrange: Create a moderately damaged tile
    const tile = { type: 'coal', hp: 40, maxHp: 100 };

    // Act: Get health bar
    const healthBar = getTileHealthBar(tile);

    // Assert: Orange color for moderately damaged tile
    expect(healthBar).toContain('#FF9800');
    expect(healthBar).toContain('width:40%');
  });

  test('getTileHealthBar returns red bar when HP < 25%', () => {
    // Arrange: Create a critically damaged tile
    const tile = { type: 'coal', hp: 10, maxHp: 100 };

    // Act: Get health bar
    const healthBar = getTileHealthBar(tile);

    // Assert: Red color for critically damaged tile
    expect(healthBar).toContain('#F44336');
    expect(healthBar).toContain('width:10%');
  });

  test('plot progression through multiple digDown calls', () => {
    // Arrange: Create a plot
    const plot = createPlot('plot-A-I-10', 0, -1);

    // Act: Dig down multiple times
    digDown(plot);
    digDown(plot);
    digDown(plot);

    // Assert: Tiles expanded to deeper levels
    expect(plot.tiles.length).toBe(25);
    expect(plot.undergroundLevels).toBe(-4);
  });

  test('multiple north expansions create separate plots', () => {
    // Arrange: Create a plot with enough money
    const plot = createPlot('plot-A-I-11', 0, -1);
    plot.money = 2000;

    // Act: Buy multiple north plots
    buyNorthPlot(plot, 500);
    buyNorthPlot(plot, 500);
    buyNorthPlot(plot, 500);

    // Assert: Multiple expansions
    expect(plot.northExpansions).toBe(3);
    expect(plot.money).toBe(500); // Started with 2000, spent 1500
  });

  test('plot maintains money across operations', () => {
    // Arrange: Create a plot
    const plot = createPlot('plot-A-I-12', 0, -1);
    plot.money = 1000;

    // Act: Perform various operations
    digDown(plot);
    buyNorthPlot(plot, 300);

    // Assert: Money correctly deducted
    expect(plot.money).toBe(700);
  });

  test('getTileTypeDisplay handles unknown tile types', () => {
    // Arrange: Create a tile with unknown type
    const tile = { type: 'unknown-type' as any, hp: 100, maxHp: 100 };

    // Act: Get display
    const display = getTileTypeDisplay(tile);

    // Assert: Returns empty string for unknown types
    expect(display).toBe('');
  });

  test('getTileHealthBar handles tile with max HP', () => {
    // Arrange: Create a fully healthy tile
    const tile = { type: 'coal', hp: 100, maxHp: 100 };

    // Act: Get health bar
    const healthBar = getTileHealthBar(tile);

    // Assert: Green color for fully healthy tile
    expect(healthBar).toContain('#4CAF50');
    expect(healthBar).toContain('width:100%');
  });

  test('getTileHealthBar handles tile with fractional HP', () => {
    // Arrange: Create a tile with fractional HP
    const tile = { type: 'coal', hp: 33.3, maxHp: 100 };

    // Act: Get health bar
    const healthBar = getTileHealthBar(tile);

    // Assert: Orange color (between 25-50%)
    expect(healthBar).toContain('#FF9800');
    expect(healthBar).toContain('width:33.3%');
  });
});

describe('Mines & Plot Progression - Integration Tests', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('complete plot expansion workflow', () => {
    // Arrange: Create initial plot
    const plot = createPlot('plot-A-I-13', 0, -1);
    plot.money = 2500;

    // Act: Expand plot through multiple operations
    digDown(plot);
    buyNorthPlot(plot, 500);
    digDown(plot);
    buyNorthPlot(plot, 500);

    // Assert: Plot expanded correctly
    expect(plot.northExpansions).toBe(2);
    expect(plot.undergroundLevels).toBe(-3);
    expect(plot.money).toBe(1000); // Started with 2500, spent 1000
  });

  test('plot name updates after north expansion', () => {
    // Arrange: Create a plot
    const plot = createPlot('plot-A-I-14', 0, -1);

    // Act: Get initial name
    const initialName = getPlotName(plot);
    expect(initialName).toBe('Plot A I 1');

    // Act: Expand north
    plot.money = 500;
    buyNorthPlot(plot, 500);

    // Act: Get new name
    const newName = getPlotName(plot);

    // Assert: Name updated
    expect(newName).toBe('Plot B I -1');
  });

  test('plot can be expanded multiple times with sufficient funds', () => {
    // Arrange: Create a plot with lots of money
    const plot = createPlot('plot-A-I-15', 0, -1);
    plot.money = 10000;

    // Act: Expand north 10 times
    for (let i = 0; i < 10; i++) {
      expect(buyNorthPlot(plot, 500)).toBe(true);
    }

    // Assert: Expanded 10 times
    expect(plot.northExpansions).toBe(10);
    expect(plot.money).toBe(5000);
  });

  test('digDown can be called multiple times on same plot', () => {
    // Arrange: Create a plot
    const plot = createPlot('plot-A-I-16', 0, -1);

    // Act: Dig down multiple times
    for (let i = 0; i < 5; i++) {
      digDown(plot);
    }

    // Assert: Can dig down repeatedly
    expect(plot.undergroundLevels).toBe(-6);
    expect(plot.tiles.length).toBe(25);
  });

  test('plot maintains state through multiple operations', () => {
    // Arrange: Create a plot
    const plot = createPlot('plot-A-I-17', 0, -1);
    plot.money = 1000;

    // Act: Perform various operations
    digDown(plot);
    buyNorthPlot(plot, 300);
    digDown(plot);
    buyNorthPlot(plot, 200);

    // Assert: State maintained correctly
    expect(plot.northExpansions).toBe(2);
    expect(plot.undergroundLevels).toBe(-3);
    expect(plot.money).toBe(500);
  });
});

describe('Mines & Plot Progression - Edge Cases', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  test('createPlot handles zero underground levels', () => {
    // Act: Create a plot at ground level
    const plot = createPlot('plot-A-I-18', 0, 0);

    // Assert: Plot created correctly
    expect(plot.undergroundLevels).toBe(0);
    expect(plot.tiles.length).toBe(0);
  });

  test('buyNorthPlot handles exact money amount', () => {
    // Arrange: Create a plot with exact amount needed
    const plot = createPlot('plot-A-I-19', 0, -1);
    plot.money = 500;

    // Act: Try to buy
    const success = buyNorthPlot(plot, 500);

    // Assert: Purchase succeeds with exact amount
    expect(success).toBe(true);
    expect(plot.money).toBe(0);
  });

  test('buyNorthPlot handles money just below threshold', () => {
    // Arrange: Create a plot with almost enough money
    const plot = createPlot('plot-A-I-20', 0, -1);
    plot.money = 499;

    // Act: Try to buy
    const success = buyNorthPlot(plot, 500);

    // Assert: Purchase fails
    expect(success).toBe(false);
    expect(plot.money).toBe(499);
  });

  test('getPlotName handles large north expansion numbers', () => {
    // Arrange: Create a plot with many expansions
    const plot = createPlot('plot-A-I-21', 9, -1);

    // Act: Get name
    const name = getPlotName(plot);

    // Assert: Name uses Roman numeral X
    expect(name).toBe('Plot J I -1');
  });

  test('getTileTypeDisplay handles all valid tile types', () => {
    // Arrange: Create tiles of all valid types
    const validTypes = ['empty', 'rubble', 'dirt', 'coal', 'oil', 'copper', 'super-alloy'];

    // Act & Assert: Each type returns correct display
    for (const type of validTypes) {
      const display = getTileTypeDisplay({ type, hp: 100, maxHp: 100 } as any);
      expect(display.length).toBeGreaterThan(0); // Should have emoji or be empty for 'empty'
    }
  });

  test('getTileHealthBar handles tile with HP slightly above threshold', () => {
    // Arrange: Create a tile just above green threshold
    const tile = { type: 'coal', hp: 51, maxHp: 100 };

    // Act: Get health bar
    const healthBar = getTileHealthBar(tile);

    // Assert: Green color (just above 50%)
    expect(healthBar).toContain('#4CAF50');
  });

  test('getTileHealthBar handles tile with HP just below threshold', () => {
    // Arrange: Create a tile just below green threshold
    const tile = { type: 'coal', hp: 49, maxHp: 100 };

    // Act: Get health bar
    const healthBar = getTileHealthBar(tile);

    // Assert: Orange color (just below 50%)
    expect(healthBar).toContain('#FF9800');
  });
});
