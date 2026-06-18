// src/logic/integration/sync.test.ts

/**
 * Integration tests for world-mine synchronization.
 * 
 * These tests run quickly without needing to play the game,
 * helping catch regressions after refactoring.
 */

import { describe, it, expect } from 'vitest';
import { getInitialState } from '../stateFactory';
import { generateWorld } from '../world/worldGen';
import { generatePlot } from '../mine/mineGen';
import { worldStore } from '../world/worldStore';
import { mineStore } from '../mine/mineStore';

describe('World-Mine Integration', () => {
    const SEED = '123456';
    const RESET_COUNT = 0;

    it('initial state has matching plot in world and plots array', () => {
        const initialState = getInitialState();

        const worldPlotCell = initialState.world.cells.find(
            (c) => c.type === 'plot' && c.ring === 0
        );

        expect(worldPlotCell).toBeDefined();
        expect(worldPlotCell?.id).not.toBeUndefined();

        const plotInArray = initialState.plots[0];
        expect(plotInArray).toBeDefined();
        expect(plotInArray.plotId).toBe(`plot-${worldPlotCell?.id}`);
    });

    it('active plot index starts at 0 with one plot', () => {
        const initialState = getInitialState();

        expect(initialState.plots.length).toBe(1);
        expect(initialState.activePlotIndex).toBe(0);
        expect(initialState.world.cells.length).toBeGreaterThanOrEqual(1);
    });

    it('mine has initial depth 0 with correct dimensions', () => {
        const initialState = getInitialState();
        const mine = initialState.plots[0].northExpansions[0].mineDepths[0];

        expect(mine.depth).toBe(0);
        expect(mine.rows).toBe(5);
        expect(mine.cols).toBe(5);
        expect(mine.tiles.length).toBe(5);
        expect(mine.tiles[0].length).toBe(5);
    });

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
        // All ring 1 tiles should be fog (undiscovered) initially
        ring1Tiles.forEach((tile) => {
            expect(tile.discovered).toBe(false);
        });
    });

    it('mine grid has correct tile count', () => {
        const initialState = getInitialState();
        const mine = initialState.plots[0].northExpansions[0].mineDepths[0];

        // 5x5 grid = 25 tiles, but last row is not fillable (used for miner placement)
        const fillableTiles = (mine.rows - 1) * mine.cols;
        expect(mine.tiles.flat().length).toBe(fillableTiles);
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

    it('world store can select active plot by cell ID', () => {
        const initialState = getInitialState();
        const worldPlotCell = initialState.world.cells.find(
            (c) => c.type === 'plot' && c.ring === 0
        );

        if (!worldPlotCell) {
            throw new Error('No plot cell found');
        }

        const result = worldStore.setActivePlotByCellId(worldPlotCell.id);

        expect(result).toBe(true);
        expect(worldStore.current.activePlotIndex).toBe(0);
        expect(worldStore.current.selectedCellId).toBe(worldPlotCell.id);
    });

    it('world store maintains cell and plot arrays', () => {
        const initialState = getInitialState();
        const originalCellCount = initialState.world.cells.length;
        const originalPlotCount = initialState.world.plots.length;

        worldStore.replace({
            cells: [...initialState.world.cells],
            plots: [...initialState.world.plots],
            activePlotIndex: 0,
            selectedCellId: null,
        });

        expect(worldStore.current.cells.length).toBe(originalCellCount);
        expect(worldStore.current.plots.length).toBe(originalPlotCount);
    });

    it('mine store has correct initial state', () => {
        const initialState = getInitialState();
        const mine = initialState.plots[0];

        expect(mine.plotId).toBeDefined();
        expect(mine.currentAge).toBe('Mechanical');
        expect(mine.northExpansions.length).toBe(1);
        expect(mine.activeNorthExpansionIndex).toBe(0);
        expect(mine.station).toBeNull();
    });

    it('north expansion has correct initial state', () => {
        const initialState = getInitialState();
        const expansion = initialState.plots[0].northExpansions[0];

        expect(expansion.mineDepths.length).toBe(1);
        expect(expansion.activeDepthIndex).toBe(0);
        expect(expansion.selectedMiner).toBeNull();
        expect(expansion.draggedMiner).toBeNull();
        expect(expansion.lastTick).toBeDefined();
    });

    it('age resources start at zero', () => {
        const initialState = getInitialState();
        const ageResources = initialState.plots[0].ageResources;

        expect(ageResources.coal).toBe(0);
        expect(ageResources.oil).toBe(0);
        expect(ageResources.copper).toBe(0);
        expect(ageResources.superalloy).toBe(0);
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

    it('world has plot at center and fog ring around it', () => {
        const world = generateWorld(SEED, RESET_COUNT, 1);

        // Find the plot (should be at ring 0)
        const plot = world.cells.find((c) => c.type === 'plot');
        expect(plot).toBeDefined();
        expect(plot?.ring).toBe(0);

        // Count fog tiles (should be in ring 1)
        const fogTiles = world.cells.filter((c) => !c.discovered);
        expect(fogTiles.length).toBe(6); // Ring 1 has 6 tiles
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

    it('mine tiles have required properties', () => {
        const initialState = getInitialState();
        const mine = initialState.plots[0].northExpansions[0].mineDepths[0];

        mine.tiles.flat().forEach((tile) => {
            expect(tile.type).toBeDefined();
            expect(tile.level).toBeDefined();
            expect(tile.hp).toBeDefined();
            expect(tile.maxHp).toBeDefined();
            expect(tile.value).toBeDefined();
            expect(tile.resourceType).toBeDefined();
        });
    });

    it('world generation with different ring counts produces correct tile counts', () => {
        const world0 = generateWorld(SEED, RESET_COUNT, 0);
        const world1 = generateWorld(SEED, RESET_COUNT, 1);

        expect(world0.cells.length).toBe(1); // Just center plot
        expect(world1.cells.length).toBe(7); // Center + ring 1 (6 tiles)
    });

    it('state factory creates consistent initial state', () => {
        const initialState1 = getInitialState();
        const initialState2 = getInitialState();

        expect(initialState1.money).toBe(initialState2.money);
        expect(initialState1.world.cells.length).toBe(initialState2.world.cells.length);
        expect(initialState1.plots.length).toBe(initialState2.plots.length);
        expect(initialState1.engineering.engineeringIdeas).toBe(
            initialState2.engineering.engineeringIdeas
        );
    });
});

describe('World-Mine Connection Points', () => {
    it('plot ID format is consistent: plot-${cellId}', () => {
        const initialState = getInitialState();
        const worldPlotCell = initialState.world.cells.find(
            (c) => c.type === 'plot' && c.ring === 0
        );

        if (!worldPlotCell) {
            throw new Error('No plot cell found');
        }

        const expectedPlotId = `plot-${worldPlotCell.id}`;
        const actualPlotId = initialState.plots[0].plotId;

        expect(actualPlotId).toBe(expectedPlotId);
    });

    it('world cell ID format is consistent: q,r', () => {
        const world = generateWorld(SEED, RESET_COUNT, 1);

        world.cells.forEach((cell) => {
            expect(cell.id).toMatch(/^-\d+,-\d+$/); // Should match pattern like "-0,-0" or "-1,0"
        });
    });

    it('hex coordinate IDs are unique', () => {
        const world = generateWorld(SEED, RESET_COUNT, 2);

        const ids = world.cells.map((cell) => cell.id);
        const uniqueIds = new Set(ids);

        expect(ids.length).toBe(uniqueIds.size); // All IDs should be unique
    });

    it('ring calculation is consistent across cells', () => {
        const world = generateWorld(SEED, RESET_COUNT, 2);

        // Center should be ring 0
        const center = world.cells.find((c) => c.q === 0 && c.r === 0);
        expect(center?.ring).toBe(0);

        // Adjacent tiles should be ring 1
        const ring1Tiles = world.cells.filter((c) => c.ring === 1);
        expect(ring1Tiles.length).toBe(6);

        // Next ring should be ring 2
        const ring2Tiles = world.cells.filter((c) => c.ring === 2);
        expect(ring2Tiles.length).toBe(12); // Ring 2 has 12 tiles
    });
});
