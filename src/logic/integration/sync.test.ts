// src/logic/integration/sync.test.ts

/**
 * Integration tests for world-mine synchronization.
 *
 * Tests run quickly without needing to play the game,
 * catching regressions after the plotsStore map refactor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getInitialState } from '../stateFactory';
import { generateWorld } from '../world/worldGen';
import { generatePlot } from '../mine/mineGen';
import { worldStore } from '../world/worldStore.svelte';
import { plotsStore } from '../mine/plotsStore.svelte';
import { isPlotBuilt } from '../mine/mineTypes';

describe('World-Mine Integration', () => {
  const SEED = '123456';
  const RESET_COUNT = 0;

  beforeEach(() => {
    const initialState = getInitialState();
    worldStore.replace(initialState.world);
    plotsStore.replaceAll(initialState.world.plots);
  });

  // ── State factory / initial shape ──────────────────────────────────────────

  it('home plot is present in world.plots and isPlotBuilt returns true', () => {
    const initialState = getInitialState();
    const homeCellId = initialState.world.activePlotCellId;
    expect(homeCellId).not.toBeNull();

    const homePlot = initialState.world.plots[homeCellId!];
    expect(homePlot).toBeDefined();
    expect(isPlotBuilt(homePlot)).toBe(true);
  });

  it('home plot cell id is the ring-0 plot cell', () => {
    const initialState = getInitialState();
    const ring0Cell = initialState.world.cells.find((c) => c.type === 'plot' && c.ring === 0);
    expect(ring0Cell).toBeDefined();
    expect(initialState.world.activePlotCellId).toBe(ring0Cell!.id);
  });

  it('home plot has depth-0 surface with correct dimensions', () => {
    const initialState = getInitialState();
    const homeCellId = initialState.world.activePlotCellId!;
    const plot = initialState.world.plots[homeCellId];
    const surface = plot.mineshafts[0]?.mineDepths.find((d) => d.depth === 0);

    expect(surface).toBeDefined();
    expect(surface!.depth).toBe(0);
    expect(surface!.rows).toBe(5);
    expect(surface!.cols).toBe(5);
    expect(surface!.tiles.length).toBe(5);
    expect(surface!.tiles[0].length).toBe(5);
  });

  it('home plot starts with one mineshaft at index 0', () => {
    const initialState = getInitialState();
    const homeCellId = initialState.world.activePlotCellId!;
    const plot = initialState.world.plots[homeCellId];

    expect(plot.mineshafts.length).toBe(1);
    expect(plot.activeMineshaftIndex).toBe(0);
    expect(plot.mineshafts[0].selectedMiner).toBeNull();
    expect(plot.mineshafts[0].draggedMiner).toBeNull();
    expect(plot.mineshafts[0].lastTick).toBeDefined();
    expect(plot.currentAge).toBe('Mechanical');
    expect(plot.station).toBeNull();
  });

  it('age resources start at zero', () => {
    const initialState = getInitialState();
    const homeCellId = initialState.world.activePlotCellId!;
    const ageResources = initialState.world.plots[homeCellId].ageResources;

    expect(ageResources.coal).toBe(0);
    expect(ageResources.oil).toBe(0);
    expect(ageResources.copper).toBe(0);
    expect(ageResources.superalloy).toBe(0);
  });

  it('mine grid has correct tile count', () => {
    const initialState = getInitialState();
    const homeCellId = initialState.world.activePlotCellId!;
    const plot = initialState.world.plots[homeCellId];
    const surface = plot.mineshafts[0]!.mineDepths[0]!;

    // all tiles present in a 5×5 grid
    expect(surface.tiles.flat().length).toBe(surface.rows * surface.cols);
  });

  it('mine tiles have required properties', () => {
    const initialState = getInitialState();
    const homeCellId = initialState.world.activePlotCellId!;
    const plot = initialState.world.plots[homeCellId];
    const surface = plot.mineshafts[0]!.mineDepths[0]!;

    surface.tiles.flat().forEach((tile) => {
      expect(tile.type).toBeDefined();
      expect(tile.level).toBeDefined();
      expect(tile.hp).toBeDefined();
      expect(tile.maxHp).toBeDefined();
      expect(tile.value).toBeDefined();
      expect(tile.resourceType).toBeDefined();
    });
  });

  it('engineering state has correct initial values', () => {
    const initialState = getInitialState();
    const engineering = initialState.engineering;

    expect(engineering.engineeringIdeas).toBe(0);
    expect(engineering.resetCount).toBe(0);
    expect(engineering.maxNorthExpansions).toBe(1);
    expect(engineering.maxUndergroundLevels).toBe(0);
  });

  it('settings have correct initial values', () => {
    const initialState = getInitialState();
    const settings = initialState.settings;

    expect(settings.worldSeed).toBe('123456');
    expect(settings.defaultView).toBe('world');
    expect(settings.navbarPosition).toBe('top');
    expect(settings.devMode).toBe(false);
  });

  it('money starts at correct initial value', () => {
    const initialState = getInitialState();
    expect(initialState.money).toBe(75);
  });

  it('state factory creates consistent initial state across calls', () => {
    const s1 = getInitialState();
    const s2 = getInitialState();

    expect(s1.money).toBe(s2.money);
    expect(s1.world.cells.length).toBe(s2.world.cells.length);
    expect(Object.keys(s1.world.plots).length).toBe(Object.keys(s2.world.plots).length);
    expect(s1.engineering.engineeringIdeas).toBe(s2.engineering.engineeringIdeas);
  });

  // ── plotsStore map model ───────────────────────────────────────────────────

  it('(a) home plot "0,0" is in plotsStore and isPlotBuilt is true', () => {
    const plot = plotsStore.get('0,0');
    expect(plot).not.toBeNull();
    expect(isPlotBuilt(plot!)).toBe(true);
  });

  it('(b) in-place mutation on plotsStore.get is immediately observable', () => {
    const plot = plotsStore.get('0,0');
    expect(plot).not.toBeNull();

    const original = plot!.currentAge;
    plot!.currentAge = 'Steam';

    expect(plotsStore.get('0,0')!.currentAge).toBe('Steam');

    // restore so other tests are not affected
    plot!.currentAge = original;
  });

  it('(c) setActivePlotCellId changes which plot plotsStore.get resolves — no copy-back needed', () => {
    // Set up a second plot in the map
    const HOME = '0,0';
    const OTHER = '1,0';
    plotsStore.set(OTHER, {
      currentAge: 'Steam',
      ageResources: { coal: 0, oil: 0, copper: 0, superalloy: 0 },
      mineshafts: [],
      activeMineshaftIndex: 0,
      station: null,
    });

    worldStore.setActivePlotCellId(HOME);
    expect(worldStore.current.activePlotCellId).toBe(HOME);
    expect(plotsStore.has(HOME)).toBe(true);

    worldStore.setActivePlotCellId(OTHER);
    expect(worldStore.current.activePlotCellId).toBe(OTHER);
    expect(plotsStore.get(worldStore.current.activePlotCellId!)!.currentAge).toBe('Steam');

    // restore
    worldStore.setActivePlotCellId(HOME);
  });

  // ── World generation ───────────────────────────────────────────────────────

  it('world ring 0 has exactly one plot', () => {
    const world = generateWorld(SEED, RESET_COUNT, 1);
    const ring0Plots = world.cells.filter((c) => c.ring === 0 && c.type === 'plot');

    expect(ring0Plots.length).toBe(1);
    expect(ring0Plots[0].discovered).toBe(true);
  });

  it('world ring 1 has exactly 6 tiles', () => {
    const world = generateWorld(SEED, RESET_COUNT, 1);
    const ring1Tiles = world.cells.filter((c) => c.ring === 1);

    expect(ring1Tiles.length).toBe(6);
    ring1Tiles.forEach((tile) => {
      expect(tile.discovered).toBe(false);
    });
  });

  it('world generation is deterministic across multiple calls', () => {
    const world1 = generateWorld(SEED, RESET_COUNT, 1);
    const world2 = generateWorld(SEED, RESET_COUNT, 1);

    expect(world1.cells.length).toBe(world2.cells.length);
    expect(world1.cells[0].type).toBe(world2.cells[0].type);
    expect(world1.cells[0].name).toBe(world2.cells[0].name);
    expect(world1.cells[0].q).toBe(world2.cells[0].q);
    expect(world1.cells[0].r).toBe(world2.cells[0].r);
  });

  it('mine generation is deterministic across multiple calls', () => {
    const mine1 = generatePlot(SEED, RESET_COUNT, 0, 0);
    const mine2 = generatePlot(SEED, RESET_COUNT, 0, 0);

    const mine1Types = mine1.tiles.flat().map((t) => t.type);
    const mine2Types = mine2.tiles.flat().map((t) => t.type);

    expect(mine1Types).toEqual(mine2Types);
  });

  it('blockers only appear at depth >= 2', () => {
    const mineDepth0 = generatePlot(SEED, RESET_COUNT, 0, 0);
    const hasBlockerAtDepth0 = mineDepth0.tiles.flat().some((t) => t.type === 'blocker');

    expect(hasBlockerAtDepth0).toBe(false);
  });

  it('world has plot at center and fog ring around it', () => {
    const world = generateWorld(SEED, RESET_COUNT, 1);

    const plot = world.cells.find((c) => c.type === 'plot');
    expect(plot).toBeDefined();
    expect(plot?.ring).toBe(0);

    const fogTiles = world.cells.filter((c) => !c.discovered);
    expect(fogTiles.length).toBe(6);
  });

  it('all cells have required properties', () => {
    const world = generateWorld(SEED, RESET_COUNT, 1);

    world.cells.forEach((cell) => {
      expect(cell.id).toBeDefined();
      expect(cell.name).toBeDefined();
      expect(cell.type).toBeDefined();
      expect(cell.q).toBeDefined();
      expect(cell.r).toBeDefined();
      expect(cell.ring).toBeDefined();
      expect(cell.discovered).toBeDefined();
    });
  });

  it('world generation with different ring counts produces correct tile counts', () => {
    const world0 = generateWorld(SEED, RESET_COUNT, 0);
    const world1 = generateWorld(SEED, RESET_COUNT, 1);

    expect(world0.cells.length).toBe(1);
    expect(world1.cells.length).toBe(7);
  });
});

describe('World-Mine Connection Points', () => {
  const SEED = '123456';
  const RESET_COUNT = 0;

  it('hex coordinate IDs are unique', () => {
    const world = generateWorld(SEED, RESET_COUNT, 2);

    const ids = world.cells.map((cell) => cell.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  it('ring calculation is consistent across cells', () => {
    const world = generateWorld(SEED, RESET_COUNT, 2);

    const center = world.cells.find((c) => c.q === 0 && c.r === 0);
    expect(center?.ring).toBe(0);

    const ring1Tiles = world.cells.filter((c) => c.ring === 1);
    expect(ring1Tiles.length).toBe(6);

    const ring2Tiles = world.cells.filter((c) => c.ring === 2);
    expect(ring2Tiles.length).toBe(12);
  });

  it('worldStore.setActivePlotCellId updates activePlotCellId', () => {
    const initialState = getInitialState();
    worldStore.replace(initialState.world);

    const ring0Cell = initialState.world.cells.find((c) => c.type === 'plot' && c.ring === 0);
    expect(ring0Cell).toBeDefined();

    worldStore.setActivePlotCellId(ring0Cell!.id);
    expect(worldStore.current.activePlotCellId).toBe(ring0Cell!.id);
  });
});
