// src/logic/world/worldNames.ts

import { log } from '../../lib/logger';
import type { ResourceType } from './worldTypes';

export const PLOT_NAMES: string[] = [
  'Prague',
  'Brno',
  'Berlin',
  'Munich',
  'Amsterdam',
  'Eindhoven',
  'Antwerp',
  'Tel Aviv',
  'London',
  'Tokyo',
  'Sydney',
  'Austin TX',
];

export const CITY_NAMES: string[] = ['Narnia', 'Atlantis', 'The Shire', 'Omicron Persei 8', 'Vulcanus', 'Fulgora', 'The Citadel'];

export const FACTORY_NAMES: Record<string, string[]> = {
  Oil: ['The Crude Awakening Refinery', 'Liquid Gold Ltd'],
  Coal: ['The Soot-able Manufacturing Co.', 'Burn Baby Burn Plant'],
  Copper: ['The Penny Pincher Foundry', 'Caesar Crappy Copper'],
  SuperAlloy: ['The Metal-morphosis Plant', 'Alloy Odyssey Factory'],
  OilAndCoal: ['The Black Gold Junction'],
};

export interface NameState {
  usedPlotNames: Set<string>;
  usedCityNames: Set<string>;
  plotNamesDepleted: boolean;
  cityNamesDepleted: boolean;
}

export function createNameState(): NameState {
  return {
    usedPlotNames: new Set(),
    usedCityNames: new Set(),
    plotNamesDepleted: false,
    cityNamesDepleted: false,
  };
}

export function usePlotName(state: NameState, name: string): void {
  state.usedPlotNames.add(name);
}

export function useCityName(state: NameState, name: string): void {
  state.usedCityNames.add(name);
}

export function isPlotNameAvailable(state: NameState, name: string): boolean {
  return !state.usedPlotNames.has(name);
}

export function isCityNameAvailable(state: NameState, name: string): boolean {
  return !state.usedCityNames.has(name);
}

export interface SeededRng {
  (): number;
}

export function pickUniquePlotName(state: NameState, rng: SeededRng, reservedNames: string[] = []): string | null {
  if (state.plotNamesDepleted) {
    return null;
  }

  const available = PLOT_NAMES.filter((name) => !state.usedPlotNames.has(name) && !reservedNames.includes(name));

  if (available.length === 0) {
    state.plotNamesDepleted = true;
    log.info('worldNames', 'Plot name pool exhausted');
    return null;
  }

  const index = Math.floor(rng() * available.length);
  const name = available[index];

  usePlotName(state, name);
  return name;
}

export function pickUniqueCityName(state: NameState, rng: SeededRng): string | null {
  if (state.cityNamesDepleted) {
    return null;
  }

  const available = CITY_NAMES.filter((name) => !state.usedCityNames.has(name));

  if (available.length === 0) {
    state.cityNamesDepleted = true;
    log.info('worldNames', 'City name pool exhausted');
    return null;
  }

  const index = Math.floor(rng() * available.length);
  const name = available[index];

  useCityName(state, name);
  return name;
}

export function pickFactoryName(resourceType: ResourceType | string, rng: SeededRng): string {
  let pool = FACTORY_NAMES[resourceType];

  if (!pool) {
    const singleResource = resourceType as ResourceType;
    if (singleResource in FACTORY_NAMES) {
      pool = FACTORY_NAMES[singleResource];
    }
  }

  if (!pool || pool.length === 0) {
    return 'The Industrial Complex';
  }

  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

export function pickFactoryNameForResources(resourceTypes: ResourceType[], rng: SeededRng): string {
  if (resourceTypes.length === 0) {
    return pickFactoryName('Coal', rng);
  }

  if (resourceTypes.length === 1) {
    return pickFactoryName(resourceTypes[0], rng);
  }

  const combinedKey = resourceTypes.join('And');
  const pool = FACTORY_NAMES[combinedKey];

  if (!pool || pool.length === 0) {
    return pickFactoryName(resourceTypes[0], rng);
  }

  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

export function areBothPoolsDepleted(state: NameState): boolean {
  return state.plotNamesDepleted && state.cityNamesDepleted;
}

export function canIgnoreReset(state: NameState): boolean {
  return !state.plotNamesDepleted || !state.cityNamesDepleted;
}

export function isRing0(ring: number): boolean {
  return ring === 0;
}

export function getReservedNames(ring: number): string[] {
  if (isRing0(ring)) {
    return [];
  }
  return ['Prague'];
}
