// src/logic/station/trainTick.test.ts
import { describe, it, expect } from 'vitest';
import type { PlotState, AgeResources } from '../mine/mineTypes';
import type { Train, Trip } from './stationTypes';
import { createEmptyStation, createPlatform, createTrain } from './stationTypes';
import { getCargoSaleValue, getCityPayout } from './stationBalance';
import { processTrains } from './trainTick';
// Reuse the world/plot helpers from the actions test:
import { makeTestPlot } from './stationActions.test';
import type { WorldCell, WorldState } from '../world/worldTypes';

function makeCell(id: string, type: WorldCell['type'], discovered = true): WorldCell {
  const [q, r] = id.split(',').map(Number);
  return { id, name: id, type, q, r, ring: Math.max(Math.abs(q), Math.abs(r)), discovered };
}

function makeWorld(cells: WorldCell[]): WorldState {
  return { cells, plots: {}, activePlotCellId: '0,0', inspectedCellId: null };
}

function plotWithTrain(trip: Trip | null): { plot: PlotState; train: Train } {
  const plot = makeTestPlot();
  const station = createEmptyStation('s1');
  const platform = createPlatform('p1', 0, 0);
  const train = createTrain('t1', 'Mechanical');
  train.carts.push({ type: 'passenger', cartType: 'simple', count: 2 });
  train.trip = trip;
  platform.train = train;
  station.platforms.push(platform);
  plot.station = station;
  return { plot, train };
}

const trip = (overrides: Partial<Trip>): Trip => ({
  kind: 'route',
  targetCellId: '2,0',
  departedAt: 0,
  durationMs: 10_000,
  cargo: {},
  ...overrides,
});

describe('processTrains', () => {
  it('pays a city payout when the trip completes and clears the trip', () => {
    const { plot, train } = plotWithTrain(trip({}));
    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('2,0', 'city')]);

    const early = processTrains({ '0,0': plot }, world, 100, 9_999);
    expect(early.completedTrips).toBe(0);
    expect(train.trip).not.toBeNull();

    const done = processTrains({ '0,0': plot }, world, 100, 10_000);
    expect(done.completedTrips).toBe(1);
    expect(done.nextMoney).toBe(100 + getCityPayout(2, train.carts));
    expect(train.trip).toBeNull();
  });

  it('sells cargo at a factory', () => {
    const cargo: Partial<AgeResources> = { coal: 10 };
    const { plot } = plotWithTrain(trip({ cargo }));
    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('2,0', 'factory')]);

    const done = processTrains({ '0,0': plot }, world, 0, 99_999);
    expect(done.nextMoney).toBe(getCargoSaleValue(cargo));
  });

  it('deposits cargo into the target plot, scaffolding it if missing', () => {
    const { plot } = plotWithTrain(trip({ targetCellId: '2,0', cargo: { coal: 7 } }));
    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('2,0', 'plot')]);
    const plots: Record<string, PlotState> = { '0,0': plot };

    const done = processTrains(plots, world, 0, 99_999);
    expect(done.nextMoney).toBe(0);
    expect(plots['2,0']).toBeDefined(); // scaffolded
    expect(plots['2,0'].ageResources.coal).toBe(7);
  });

  it('reveals the cell on explore completion', () => {
    const { plot } = plotWithTrain(trip({ kind: 'explore', targetCellId: '0,4' }));
    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('0,4', 'city', false)]);

    processTrains({ '0,0': plot }, world, 0, 99_999);
    expect(world.cells.find((c) => c.id === '0,4')?.discovered).toBe(true);
  });

  it('clamps clock-back: a future departedAt is reset to now, trip continues', () => {
    const { plot, train } = plotWithTrain(trip({ departedAt: 50_000 }));
    const world = makeWorld([makeCell('0,0', 'plot'), makeCell('2,0', 'city')]);

    const result = processTrains({ '0,0': plot }, world, 0, 20_000);
    expect(result.completedTrips).toBe(0);
    expect(train.trip?.departedAt).toBe(20_000);
  });

  it('is a no-op for idle trains and empty plots', () => {
    const { plot } = plotWithTrain(null);
    const result = processTrains({ '0,0': plot }, makeWorld([]), 42, 99_999);
    expect(result).toEqual({ nextMoney: 42, completedTrips: 0 });
  });
});
