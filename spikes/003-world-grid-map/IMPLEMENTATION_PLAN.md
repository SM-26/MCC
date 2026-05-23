# Merge & Choo-Choo: Alpha 1 Implementation Plan

**Status:** Approved after Review by a human  
**Date:** 2026-05-23  
**Author:** Natalie (Novel Algorithmic Tool Aiding Logical Insight Execution)  

---

## Executive Summary

This plan transitions the game from **MVP3 prototype** (iframe-based vanilla HTML/JS in spikes/) to **production-ready code** with proper slice boundaries, state management, and persistence. The goal is to maintain all validated gameplay loops while establishing a clean architecture for future expansion.

**Project Name:** Merge & Choo-Choo — Alpha 1  
**Build Directory:** `/mnt/c/users/or_ga/Documents/MCC/` (not spikes/)  
**Deployment Target:** Python HTTP server (local development) / Docker (production)

---

## Phase 1: Persistence Layer (Week 1)

### Goal
Define and implement the authoritative save format using localStorage (`mcc_save`), with migration hooks for future versions.

### Deliverables
- `src/save/save.ts` — Save/Load utilities with versioning
- `src/core/types/state.ts` — Complete state model definition
- Migration strategy for existing saves

### Implementation Steps

#### 1.1 Define State Model
Create comprehensive TypeScript interfaces for all game objects:

```typescript
// src/core/types/state.ts

interface GameState {
  money: number;              // float, can grow very large
  
  // Active plot reference
  playerPlotId: string;       // e.g., "plot-A-II--3"
  
  // Plots array
  plots: Plot[];
  
  // World state
  worldDiscovered: string[];  // discovered location IDs
  worldGrid: WorldCell[];     // hex grid cells (19 hexes for 3-ring)
  
  // Destinations (cities/factories)
  destinations: Destination[];
  
  // Meta progression
  engineeringIdeas: number;   // EI points
  resetCount: number;         // nuke count
  
  // Save metadata
  version: number;            // save format version (1 for MVP4)
  lastSaveTime: number;       // timestamp of last save
}

interface Plot {
  id: string;                 // e.g., "plot-A-II--3"
  
  // Expansion tracking
  northExpansions: number;    // Roman numeral count (0 = I, 1 = II)
  undergroundLevels: number;  // depth levels (-1, -2, etc.)
  
  // Clear states
  softCleared: boolean;        // rubble/ore cleared, dirt remains
  hardCleared: boolean;        // everything mineable extracted
  
  // Age progression
  ageResources: {
    coal: number;
    oil: number;
    copper: number;
    superAlloy: number;
  };
  currentAge: string;         // e.g., "basic"
  availableAges: string[];    // unlocked ages
  
  // Station info
  stationBuilt: boolean;
  stationId: string | null;   // null if no station
  
  // Tiles grid (25 tiles per level)
  tiles: Tile[];
  
  // Miners
  miners: Miner[];
}

interface Tile {
  level: number;              // terrain depth (1, -1, -2, etc.)
  type: 'empty' | 'rubble' | 'dirt' | 'coal' | 'oil' | 'copper' | 'super-alloy';
  
  // Health system
  hp: number;                 // current health (0 = destroyed)
  maxHp: number;              // max health
  
  // Value when mined
  value: number;              // money value
  resourceType: null | 'coal' | 'oil' | 'copper' | 'super-alloy';
}

interface Miner {
  level: number;
  tileIndex: number;
  facing: number;             // 0, 90, 180, 270
}

interface Station {
  id: string;                 // e.g., "station-plot-A-II-u1"
  plotId: string;
  
  // Platforms array
  platforms: Platform[];
  
  // Train yard inventory
  trainyardInventory: {
    engines: Record<string, number>;  // by age
    carts: Record<string, number>;     // by type
  };
}

interface Platform {
  id: string;
  level: number;              // 1, 6, 11, 16...
  train: Train | null;
}

interface Train {
  engineAge: string;
  engineLevel: number;
  carts: CartSlot[];
  state: 'idle' | 'traveling' | 'arrived';
  route: Route | null;
  remainingTime: number;
  totalTripTime: number;
}

interface CartSlot {
  type: 'passenger' | 'cargo';
  cartType: string;
  count: number;
}

interface Route {
  destinationId: string;
  destinationType: 'city' | 'factory';
}

interface WorldCell {
  id: string;
  name: string;
  type: 'fog' | 'plot' | 'city' | 'factory';
  
  // Axial hex coordinates
  q: number;
  r: number;
  
  discovered: boolean;
}

interface Destination {
  id: string;
  name: string;
  type: 'city' | 'factory';
  distance: number;
  basePayout: number;
  discovered: boolean;
}
```

#### 1.2 Implement Save/Load Utilities
```typescript
// src/save/save.ts

const SAVE_KEY = 'mcc_save';
const CURRENT_VERSION = 1;

export interface SaveData extends GameState {
  _version: number;
  _savedAt: number;
}

export function loadSave(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    
    const saved: SaveData = JSON.parse(raw);
    
    // Version check and migration
    if (saved._version !== CURRENT_VERSION) {
      console.warn(`Save version mismatch: ${saved._version} vs ${CURRENT_VERSION}`);
      // Migration logic here
    }
    
    return createValidatedSave(saved);
  } catch (error) {
    console.error('Failed to load save:', error);
    return createDefaultSave();
  }
}

export function saveGame(state: GameState): void {
  const saveData: SaveData = {
    ...state,
    _version: CURRENT_VERSION,
    _savedAt: Date.now()
  };
  
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

export function createDefaultSave(): GameState {
  // Generate initial world grid (3-ring hex grid)
  const worldGrid = generateInitialWorldGrid();
  
  return {
    money: 200,
    playerPlotId: 'plot-A-I-1',
    plots: [],
    worldDiscovered: ['plot-A-I-1'],
    worldGrid,
    destinations: [],
    engineeringIdeas: 0,
    resetCount: 0,
    version: CURRENT_VERSION,
    lastSaveTime: Date.now()
  };
}

export function createValidatedSave(saved: SaveData): GameState {
  // Validate and normalize state
  const normalized = {
    ...saved,
    money: Number(saved.money || 0),
    plots: saved.plots || [],
    worldDiscovered: saved.worldDiscovered || [],
    destinations: saved.destinations || [],
    engineeringIdeas: Number(saved.engineeringIdeas || 0),
    resetCount: Number(saved.resetCount || 0)
  };
  
  // Ensure player plot exists
  if (!normalized.plots.find(p => p.id === normalized.playerPlotId)) {
    normalized.plots.push(createInitialPlot());
  }
  
  return normalized;
}

export function migrateSave(oldVersion: number, newVersion: number): SaveData {
  // Migration logic for version upgrades
  const migrated = structuredClone(oldVersion);
  
  if (oldVersion === 0 && newVersion === 1) {
    // Add missing fields with defaults
    migrated._version = newVersion;
    migrated.lastSaveTime = Date.now();
  }
  
  return migrated;
}
```

#### 1.3 Generate Initial World Grid
```typescript
// src/world/grid.ts

export function generateInitialWorldGrid(): WorldCell[] {
  // 3-ring hex grid (19 hexes total)
  const cells: WorldCell[] = [];
  
  // Center plot (ring 0)
  cells.push(createHexCell('plot-A-I-1', 'Plot A I 1', 'plot', 0, 0));
  
  // Ring 1 (6 hexes)
  for (let i = 0; i < 6; i++) {
    const q = getRing1Coord(i);
    const r = getRing1CoordNext(i);
    const type = i === 3 ? 'city' : i === 0 ? 'factory' : 'fog';
    cells.push(createHexCell(
      `${type}-${i}`,
      type === 'plot' ? '' : `${type.charAt(0).toUpperCase()}${type.slice(1)} ${i + 1}`,
      type,
      q, r
    ));
  }
  
  // Ring 2 (12 hexes)
  for (let i = 0; i < 12; i++) {
    const q = getRing2Coord(i);
    const r = getRing2CoordNext(i);
    cells.push(createHexCell(
      `fog-${i + 6}`,
      '',
      'fog',
      q, r
    ));
  }
  
  return cells;
}

function createRing1Coords(): [number, number][] {
  return [
    [1, -1], [-1, -1], [-2, 0], [-1, 1], [0, 1], [1, 0]
  ];
}

function getRing1Coord(i: number): number {
  const coords = createRing1Coords();
  return coords[i % 6][0];
}

function getRing1CoordNext(i: number): number {
  const coords = createRing1Coords();
  return coords[(i + 1) % 6][1];
}

function getRing2Coords(): [number, number][][] {
  // Simplified ring 2 coordinates
  return [
    [[0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 0], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2]]
  ][0];
}

function getRing2Coord(i: number): number {
  const coords = getRing2Coords();
  return coords[i % 12][0];
}

function getRing2CoordNext(i: number): number {
  const coords = getRing2Coords();
  return coords[(i + 1) % 12][1];
}

function createHexCell(id: string, name: string, type: string, q: number, r: number): WorldCell {
  return {
    id,
    name,
    type,
    q,
    r,
    discovered: type === 'plot'
  };
}
```

---

## Phase 2: Mines Slice (Week 2)

### Goal
Refactor mines.html into a proper TypeScript module with clean state management and slice boundaries.

### Deliverables
- `src/mines/index.ts` — Main mines slice logic
- `src/mines/tiles.ts` — Tile generation and management
- `src/mines/miners.ts` — Miner behavior and merging
- `src/ui/mines-screen.tsx` — Mines UI component

### Implementation Steps

#### 2.1 Tile Initialization with Depth-Based Mixing
```typescript
// src/mines/tiles.ts

export interface Tile {
  level: number;
  type: 'empty' | 'rubble' | 'dirt' | 'coal' | 'oil' | 'copper' | 'super-alloy';
  hp: number;
  maxHp: number;
  value: number;
  resourceType: null | 'coal' | 'oil' | 'copper' | 'super-alloy';
}

export function initializeTiles(plotDepth: number, tileCount: number = 25): Tile[] {
  const tiles: Tile[] = [];
  
  for (let i = 0; i < tileCount; i++) {
    const level = plotDepth;
    
    // Determine terrain type based on depth with weighted mixing
    let primaryType: string, secondaryType: string;
    let weightPrimary = 0.5;
    
    if (level <= 5) {
      // Ground to level 5: mixed rubble/dirt
      primaryType = 'rubble';
      secondaryType = 'dirt';
      // Weight shifts toward rubble at shallower depths
      weightPrimary = Math.max(0.3, 0.7 - (level - 1) * 0.05);
    } else if (level <= 10) {
      // Level 6-10: dirt and oil
      primaryType = 'oil';
      secondaryType = 'dirt';
      weightPrimary = Math.max(0.3, 0.7 - (level - 5) * 0.05);
    } else if (level <= 15) {
      // Level 11-15: dirt and copper
      primaryType = 'copper';
      secondaryType = 'dirt';
      weightPrimary = Math.max(0.3, 0.7 - (level - 10) * 0.05);
    } else if (level <= 20) {
      // Level 16-20: dirt and super-alloy
      primaryType = 'super-alloy';
      secondaryType = 'dirt';
      weightPrimary = Math.max(0.3, 0.7 - (level - 15) * 0.05);
    } else {
      // Level 21+: mixed all resources
      primaryType = 'oil';
      secondaryType = 'copper';
      weightPrimary = 0.5;
    }
    
    // Determine actual type based on weight
    const isPrimary = Math.random() < weightPrimary;
    const type = isPrimary ? primaryType : secondaryType;
    const resourceType = type === 'dirt' ? null : type;
    
    // HP scales with depth
    const isResource = type !== 'dirt';
    const baseHp = isResource ? (50 + Math.abs(level) * 25) : (20 + Math.abs(level) * 10);
    
    tiles.push({
      level,
      type,
      hp: 0,
      maxHp: 0,
      value: getResourceValue(type),
      resourceType
    });
  }
  
  return tiles;
}

export function getResourceValue(resource: string): number {
  const values: Record<string, number> = {
    'rubble': 5,
    'dirt': 1,
    'coal': 2,
    'oil': 2,
    'copper': 3,
    'super-alloy': 5
  };
  return values[resource] || 1;
}
```

#### 2.2 Miner Placement Logic
```typescript
// src/mines/miners.ts

export interface Miner {
  level: number;
  tileIndex: number;
  facing: number;
}

export function findBestMinerPlacement(plot: Plot): number | null {
  // Find empty tiles, sort by depth (most negative first)
  const emptyTiles = plot.tiles
    .filter(t => t.type === 'empty')
    .map((t, i) => ({ tile: t, index: i }))
    .sort((a, b) => a.tile.level - b.tile.level); // most negative first
  
  if (emptyTiles.length === 0) return null;
  
  return emptyTiles[0].index;
}

export function placeMiner(plot: Plot, minerLevel: number): Miner {
  const tileIndex = findBestMinerPlacement(plot);
  if (tileIndex === null) throw new Error('No room to place miner');
  
  const facing = getFacingDirection(tileIndex);
  
  return {
    level: minerLevel,
    tileIndex,
    facing
  };
}

function getFacingDirection(tileIndex: number): number {
  // Simple heuristic: face toward center or nearest target
  const x = tileIndex % 5;
  const y = Math.floor(tileIndex / 5);
  
  if (x < 2) return 0;       // face right
  if (x > 2) return 180;     // face left
  if (y < 2) return 90;      // face down
  return 270;                // face up
}
```

#### 2.3 Miner Behavior System
```typescript
// src/mines/miners.ts (continued)

export function updateMiner(miner: Miner, plot: Plot, dt: number): void {
  const idx = findTarget(miner, plot);
  if (idx === null) return;
  
  const target = plot.tiles[idx];
  const damage = Math.pow(2, miner.level - 1) * 5 * dt;
  
  miner.facing = getFacingDirection(miner.tileIndex, idx);
  target.hp -= damage;
  
  if (target.hp <= 0) {
    handleTileDestruction(target, plot);
  }
}

export function findTarget(miner: Miner, plot: Plot): number | null {
  const neighbors = getNeighbors(miner.tileIndex);
  const validTargets = neighbors.filter(i => plot.tiles[i].type !== 'empty');
  
  if (validTargets.length === 0) return null;
  
  // Sort by priority: resource > rubble > dirt, then by HP
  validTargets.sort((a, b) => {
    const A = plot.tiles[a], B = plot.tiles[b];
    
    // Prefer resources over rubble/dirt
    if (A.resourceType && !B.resourceType) return -1;
    if (!A.resourceType && B.resourceType) return 1;
    
    // Same type: prefer lower HP (easier to destroy)
    return A.hp - B.hp;
  });
  
  return validTargets[0];
}

export function getNeighbors(idx: number): number[] {
  const n = [];
  const x = idx % 5;
  const y = Math.floor(idx / 5);
  
  if (y > 0) n.push(idx - 5);
  if (x < 4) n.push(idx + 1);
  if (y < 4) n.push(idx + 5);
  if (x > 0) n.push(idx - 1);
  
  return n;
}

export function getFacingDirection(from: number, to: number): number {
  const d = to - from;
  if (d === -5) return 0;      // up
  if (d === 1) return 90;      // right
  if (d === 5) return 180;     // down
  if (d === -1) return 270;    // left
  return 0;
}

function handleTileDestruction(tile: Tile, plot: Plot): void {
  // Add money or resources
  if (tile.resourceType) {
    plot.ageResources[tile.resourceType as keyof typeof plot.ageResources] += tile.value;
  } else {
    plot.money += tile.value;
  }
  
  tile.type = 'empty';
  tile.hp = 0;
}
```

#### 2.4 Merge System
```typescript
// src/mines/miners.ts (continued)

export function attemptMerge(plot: Plot, selectedMiner: Miner): boolean {
  // Find same-level miner on adjacent tile
  const neighbors = getNeighbors(selectedMiner.tileIndex);
  const targetIndex = neighbors.find(idx => {
    const target = plot.tiles[idx];
    if (target.type !== 'empty') return false;
    
    const existingMiner = plot.miners.find(m => m.tileIndex === idx);
    if (!existingMiner) return false;
    
    return existingMiner.level === selectedMiner.level && 
           existingMiner !== selectedMiner;
  });
  
  if (targetIndex === undefined) return false;
  
  // Perform merge
  const targetMiner = plot.miners.find(m => m.tileIndex === targetIndex)!;
  plot.miners = plot.miners.filter(m => m !== selectedMiner && m !== targetMiner);
  
  // Upgrade existing miner
  targetMiner.level++;
  
  return true;
}

export function buyMiner(plot: Plot): Miner {
  const cost = calculateMinerCost(plot.miners.length);
  if (plot.money < cost) throw new Error('Not enough money');
  
  plot.money -= cost;
  const miner = placeMiner(plot, 1);
  
  return miner;
}

function calculateMinerCost(count: number): number {
  return 50 * Math.pow(1.5, count - 1);
}
```

---

## Phase 3: Station Slice (Week 3)

### Goal
Refactor station.html into a proper TypeScript module with clean state management and slice boundaries.

### Deliverables
- `src/station/index.ts` — Main station slice logic
- `src/station/trains.ts` — Train lifecycle and route management
- `src/station/carts.ts` — Cart inventory and fitting
- `src/ui/station-screen.tsx` — Station UI component

### Implementation Steps

#### 3.1 Station Platform System
```typescript
// src/station/platforms.ts

export interface Platform {
  id: string;
  level: number;              // 1, 6, 11, 16...
  train: Train | null;
}

export function createPlatform(stationId: string, level: number): Platform {
  return {
    id: `platform-${stationId}-${level}`,
    level,
    train: null
  };
}

export function getGroundLevel(plotDepth: number): number {
  // Ground level is always 1
  return 1;
}

export function getNextUndergroundLevel(currentLevel: number): number {
  // Underground levels are 6, 11, 16, etc.
  return currentLevel + 5;
}

export function getPlatformForLevel(plotDepth: number): Platform | null {
  // Only create platforms at valid levels (divisible by 5, starting from 1)
  if (plotDepth <= 0 || plotDepth % 5 !== 1) return null;
  
  const level = plotDepth;
  const stationId = getStationIdForPlot(plotDepth);
  
  return createPlatform(stationId, level);
}

function getStationIdForPlot(depth: number): string {
  const northExpansion = 0; // Simplified for now
  const undergroundTier = Math.floor((depth - 1) / 5);
  const tierLabel = undergroundTier === 0 ? 'g' : `u${undergroundTier + 1}`;
  
  return `station-plot-A-${getRomanNumeral(northExpansion)}-${tierLabel}`;
}

function getRomanNumeral(num: number): string {
  const numerals: Record<number, string> = {
    0: 'I', 1: 'II', 2: 'III', 3: 'IV', 4: 'V',
    5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X'
  };
  return numerals[num] || String(num);
}
```

#### 3.2 Train System with Age Progression
```typescript
// src/station/trains.ts

export interface Train {
  engineAge: string;
  engineLevel: number;
  carts: CartSlot[];
  state: 'idle' | 'traveling' | 'arrived';
  route: Route | null;
  remainingTime: number;
  totalTripTime: number;
}

export interface CartSlot {
  type: 'passenger' | 'cargo';
  cartType: string;
  count: number;
}

export interface Route {
  destinationId: string;
  destinationType: 'city' | 'factory';
}

export const ENGINE_AGES = ['basic', 'steam', 'diesel', 'electric', 'maglev'] as const;

export function createTrain(engineAge: string, engineLevel: number): Train {
  return {
    engineAge,
    engineLevel,
    carts: [],
    state: 'idle',
    route: null,
    remainingTime: 0,
    totalTripTime: 0
  };
}

export function buyEngine(station: Station, age: string): void {
  const inventory = station.trainyardInventory.engines;
  
  if (inventory[age] === undefined) {
    inventory[age] = 0;
  }
  
  inventory[age]++;
}

export function upgradeEngine(train: Train): void {
  train.engineLevel++;
}

export function fitCart(train: Train, cartType: string): CartSlot | null {
  // Check capacity constraints
  const maxCapacity = getEngineCartCapacity(train.engineAge, train.engineLevel);
  const currentCapacity = train.carts.reduce((sum, slot) => sum + slot.count, 0);
  
  if (currentCapacity >= maxCapacity) return null;
  
  // Find matching cart type
  const existingSlot = train.carts.find(slot => slot.cartType === cartType);
  
  if (existingSlot) {
    existingSlot.count++;
  } else {
    train.carts.push({
      type: 'passenger',
      cartType,
      count: 1
    });
  }
  
  return existingSlot || train.carts[train.carts.length - 1];
}

export function getEngineCartCapacity(engineAge: string, engineLevel: number): number {
  // Base capacity increases with age and level
  const baseCapacity = {
    'basic': 0,
    'steam': 2,
    'diesel': 3,
    'electric': 4,
    'maglev': 5
  }[engineAge] || 0;
  
  return baseCapacity + (engineLevel - 1);
}

export function calculateTripTime(train: Train, destination: Destination): number {
  const baseSpeed = getEngineSpeed(train.engineAge, train.engineLevel);
  const weight = 1 + getCartsWeight(train.carts);
  
  return (destination.distance / baseSpeed) * 10 * weight;
}

export function calculateTripPayout(train: Train, destination: Destination): number {
  const basePayout = destination.basePayout + (destination.distance * 5);
  
  // Calculate cart bonuses
  let bonus = 0;
  let hasCarts = false;
  
  train.carts.forEach(slot => {
    if (slot.count > 0) {
      hasCarts = true;
      const cartType = slot.cartType;
      const isPassenger = destination.type === 'city';
      const isCargo = destination.type === 'factory';
      
      if ((isPassenger && cartType.includes('passenger')) ||
          (isCargo && cartType === 'cargo')) {
        bonus += slot.count * getCartValue(cartType);
      }
    }
  });
  
  return hasCarts ? basePayout * (1 + bonus) : Math.max(basePayout * 0.25, 10);
}

function getEngineSpeed(engineAge: string, engineLevel: number): number {
  const baseSpeed = {
    'basic': 10,
    'steam': 20,
    'diesel': 35,
    'electric': 50,
    'maglev': 70
  }[engineAge] || 10;
  
  return baseSpeed * (1 + (engineLevel - 1) * 0.2);
}

function getCartsWeight(carts: CartSlot[]): number {
  const weightPerCart = {
    'passenger': 0.1,
    'doubleDecker': 0.2,
    'luxury': 0.15,
    'cargo': 0.12
  };
  
  return carts.reduce((sum, slot) => sum + slot.count * weightPerCart[slot.cartType], 0);
}

function getCartValue(cartType: string): number {
  const values = {
    'passenger': 0.5,
    'doubleDecker': 1.0,
    'luxury': 1.5,
    'cargo': 0.7
  };
  
  return values[cartType] || 0;
}
```

#### 3.3 Cart Inventory System
```typescript
// src/station/carts.ts

export interface CartInventory {
  passenger: number;
  doubleDecker: number;
  luxury: number;
  cargo: number;
}

export const CART_TYPES = {
  passenger: { name: 'Passenger Cart', category: 'passenger', baseCost: 75 },
  doubleDecker: { name: 'Double Decker', category: 'passenger', baseCost: 150 },
  luxury: { name: 'Luxury Cart', category: 'passenger', baseCost: 250 },
  cargo: { name: 'Cargo Cart', category: 'cargo', baseCost: 100 }
} as const;

export function getCartCost(cartType: string, ownedCount: number): number {
  const type = CART_TYPES[cartType];
  return Math.floor(type.baseCost * Math.pow(1.1, ownedCount));
}

export function buyCart(station: Station, cartType: string): void {
  const cost = getCartCost(cartType, station.trainyardInventory.carts[cartType]);
  
  if (station.money < cost) throw new Error('Not enough money');
  
  station.money -= cost;
  station.trainyardInventory.carts[cartType] = 
    (station.trainyardInventory.carts[cartType] || 0) + 1;
}

export function removeCart(train: Train, cartType: string): void {
  const slot = train.carts.find(slot => slot.cartType === cartType);
  
  if (!slot || slot.count <= 0) return;
  
  slot.count--;
  
  if (slot.count === 0) {
    train.carts = train.carts.filter(slot => slot.cartType !== cartType);
  }
}
```

---

## Phase 4: World Slice (Week 4)

### Goal
Refactor world map into a proper TypeScript module with hex grid rendering and discovery logic.

### Deliverables
- `src/world/index.ts` — Main world slice logic
- `src/world/hex-grid.ts` — Hex grid generation and rendering
- `src/world/discovery.ts` — Discovery timer and destination spawning
- `src/ui/world-screen.tsx` — World map UI component

### Implementation Steps

#### 4.1 Hex Grid Rendering
```typescript
// src/world/hex-grid.ts

export function renderWorldGrid(worldGrid: WorldCell[], playerPlotId: string): void {
  const container = document.getElementById('world-map');
  if (!container) return;
  
  container.innerHTML = '';
  
  worldGrid.forEach(cell => {
    const isHidden = cell.type !== 'plot' && !cell.discovered;
    
    const hex = document.createElement('div');
    hex.className = `hex ${cell.type} ${isHidden ? 'hidden' : ''} ${cell.id === playerPlotId ? 'player' : ''}`;
    
    // Calculate hex position using axial coordinates
    const pos = hexPos(cell.q, cell.r);
    hex.style.left = `${pos.left}px`;
    hex.style.top = `${pos.top}px`;
    
    // Add content
    if (cell.type === 'fog') {
      hex.innerHTML = '<div>Fog</div>';
    } else {
      hex.innerHTML = `
        <div>${cell.name || cell.id}</div>
        <div class="small">${cell.type}</div>
      `;
    }
    
    // Add click handler
    hex.onclick = () => {
      if (isHidden) {
        document.getElementById('world-msg')?.textContent = 'Undiscovered.';
        return;
      }
      
      if (cell.type === 'plot') {
        navigateToPlot(cell.id);
      } else if (cell.type === 'city' || cell.type === 'factory') {
        document.getElementById('world-msg')?.textContent = `Selected ${cell.name}`;
      }
    };
    
    container.appendChild(hex);
  });
}

export function hexPos(q: number, r: number): { left: number; top: number } {
  const size = 78;
  const gapX = 67;
  const gapY = 60;
  
  return {
    left: 160 + q * gapX + (r % 2 ? gapX / 2 : 0),
    top: 70 + r * gapY
  };
}
```

#### 4.2 Discovery System
```typescript
// src/world/discovery.ts

export interface Destination {
  id: string;
  name: string;
  type: 'city' | 'factory';
  distance: number;
  basePayout: number;
  discovered: boolean;
}

export function performExploration(): void {
  const undiscovered = state.worldDestinations.filter(d => !d.discovered);
  
  if (undiscovered.length === 0) {
    document.getElementById('world-msg')?.textContent = 'No more destinations to discover.';
    return;
  }
  
  const pick = undiscovered[0];
  pick.discovered = true;
  state.worldDiscovered.push(pick.id);
  
  document.getElementById('world-msg')?.textContent = `Discovered ${pick.name}`;
  saveGame(state);
  renderWorld();
}

export function generateRandomDestination(index: number): Destination {
  const isCity = Math.random() > 0.5;
  const ring = state.explorationsDone < 6 ? 1 : (state.explorationsDone < 18 ? 2 : 3);
  
  return {
    id: `${isCity ? 'city' : 'factory'}-${index}`,
    name: isCity 
      ? `City ${String.fromCharCode(65 + index)}` 
      : `Factory ${index + 1}`,
    type: isCity ? 'city' : 'factory',
    distance: Math.floor(Math.random() * 5) + (ring * 10),
    basePayout: isCity ? 120 : 180,
    discovered: false
  };
}
```

---

## Phase 5: UI Scaffolding (Week 5)

### Goal
Create a unified UI layer that replaces iframe-based composition with proper component rendering.

### Deliverables
- `src/ui/App.tsx` — Main app component
- `src/ui/Navigation.tsx` — Tab navigation
- `src/ui/ScreenContainer.tsx` — Screen management
- CSS modules for styling

### Implementation Steps

#### 5.1 Main App Component
```typescript
// src/ui/App.tsx

import { GameState } from '../core/types/state';
import { MinesScreen } from './mines-screen';
import { StationScreen } from './station-screen';
import { WorldScreen } from './world-screen';
import { SettingsScreen } from './settings-screen';

export function App() {
  const [activeTab, setActiveTab] = useState<'world' | 'plot' | 'station' | 'settings'>('world');
  
  return (
    <div className="app">
      <header>
        <div>
          <div id="money-display">${Math.floor(state.money)}</div>
          <div className="small" id="context">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</div>
        </div>
        <nav className="tabs">
          <button 
            className={`tab ${activeTab === 'world' ? 'active' : ''}`}
            onClick={() => setActiveTab('world')}
          >
            World
          </button>
          <button 
            className={`tab ${activeTab === 'plot' ? 'active' : ''}`}
            onClick={() => setActiveTab('plot')}
          >
            Plot
          </button>
          <button 
            className={`tab ${activeTab === 'station' ? 'active' : ''}`}
            onClick={() => setActiveTab('station')}
          >
            Station
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>
      
      <main>
        {activeTab === 'world' && <WorldScreen />}
        {activeTab === 'plot' && <MinesScreen />}
        {activeTab === 'station' && <StationScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </main>
      
      <footer>
        <div className="small">World → Plot → Station</div>
        <div className="small" id="explore-status"></div>
      </footer>
    </div>
  );
}
```

---

## Phase 6: Build & Deployment (Week 6)

### Goal
Set up Vite build pipeline, Python HTTP server for local development, and Docker for production deployment.

### Deliverables
- `vite.config.ts` — Vite configuration with ES modules support
- `package.json` — Dependencies and scripts
- `Dockerfile` — Production container image
- `docker-compose.yml` — Local development stack (Python + app)
- Development server setup (Python HTTP)

### Implementation Steps

#### 6.1 Project Structure
```
src/
├── core/
│   ├── types/
│   │   └── state.ts          # Complete state model
│   └── utils/
│       └── events.ts         # Event helpers
├── world/
│   ├── index.ts              # World slice logic
│   ├── grid.ts               # Hex grid generation
│   └── discovery.ts          # Discovery timer
├── mines/
│   ├── index.ts              # Mines slice logic
│   ├── tiles.ts              # Tile initialization
│   └── miners.ts             # Miner behavior
├── station/
│   ├── index.ts              # Station slice logic
│   ├── platforms.ts          # Platform system
│   ├── trains.ts             # Train lifecycle
│   └── carts.ts              # Cart inventory
├── save/
│   ├── save.ts               # Save/load utilities
│   └── migration.ts          # Version migration
├── ui/
│   ├── App.tsx               # Main app component
│   ├── Navigation.tsx        # Tab navigation
│   ├── mines-screen.tsx      # Mines UI
│   ├── station-screen.tsx    # Station UI
│   ├── world-screen.tsx      # World map UI
│   └── settings-screen.tsx   # Settings UI
├── content/
│   └── data.ts               # Seeded names/templates (future)
└── app.tsx                   # Entry point

public/
├── index.html                # HTML shell
└── favicon.ico

dist/                        # Vite build output

# Docker & Deployment
Dockerfile                   # Production container
docker-compose.yml           # Local dev stack (Python + app)
```

#### 6.2 Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser'
  },
  server: {
    port: 3000,
    host: true,
    watch: true
  },
  optimizeDeps: {
    include: ['lucide-react'] // if using icon library
  }
});
```

#### 6.3 Package.json
```json
{
  "name": "merge-choo-choo",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.11.5",
    "vite": "^5.1.6"
  }
}
```

#### 6.4 Entry Point
```typescript
// src/app.tsx
import { App } from './ui/App';
import { loadSave } from './save/save';

const state = loadSave();

// Initialize game state
state.plots = state.plots || [];
state.worldDiscovered = state.worldDiscovered || [];
state.destinations = state.destinations || [];

// Render app
document.body.innerHTML = `
  <div id="app">
    <App />
  </div>
`;

const root = document.getElementById('app')!;
root.appendChild(App());

// Auto-save every 5 seconds
setInterval(() => {
  const saveData = { ...state, _version: 1, _savedAt: Date.now() };
  localStorage.setItem('mcc_save', JSON.stringify(saveData));
}, 5000);
```

#### 6.5 Dockerfile (Production)
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 6.6 docker-compose.yml (Local Development)
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    environment:
      - NODE_ENV=development
    command: npm run dev

  python-server:
    image: python:3.12-slim
    ports:
      - "8000:8000"
    volumes:
      - ./dist:/usr/share/nginx/html
    command: >
      sh -c "pip install gunicorn &&
             gunicorn --bind 0.0.0.0:8000 
             nginx:conf:/etc/nginx/conf.d/default.conf"
```

#### 6.7 Python HTTP Server (Simplest for Local Dev)
```bash
# Run from /mnt/c/users/or_ga/Documents/MCC/ directory
cd /mnt/c/users/or_ga/Documents/MCC

# Install dependencies
pip install -r requirements.txt

# Start server
python -m http.server 8000
# or with CORS support for browser testing
pip install serve
serve -s dist -l 8000
```

#### 6.8 Nginx Config (for Docker)
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable caching for index.html (hot module replacement)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

---

## Migration Strategy

### 5.1 Save Migration
```typescript
// src/save/migration.ts

export function migrateSave(oldVersion: number, newVersion: number): GameState {
  const migrated = structuredClone(oldVersion);
  
  if (oldVersion === 0 && newVersion === 1) {
    // Add missing fields with defaults
    migrated._version = newVersion;
    migrated.lastSaveTime = Date.now();
    
    // Ensure player plot exists
    if (!migrated.plots.find(p => p.id === migrated.playerPlotId)) {
      migrated.plots.push(createInitialPlot());
    }
  }
  
  return migrated;
}

export function createInitialPlot(): Plot {
  return {
    id: 'plot-A-I-1',
    northExpansions: 0,
    undergroundLevels: 0,
    softCleared: false,
    hardCleared: false,
    ageResources: { coal: 0, oil: 0, copper: 0, superAlloy: 0 },
    currentAge: 'basic',
    availableAges: ['basic'],
    stationBuilt: false,
    stationId: null,
    tiles: initializeTiles(1),
    miners: []
  };
}
```

---

## Testing Checklist

### Basic Functionality
- [ ] Can a plot be initialized with correct tile types?
- [ ] Can miners be bought and placed on deepest empty tile?
- [ ] Does miner damage scale correctly with level?
- [ ] Does tile destruction add money/resources correctly?
- [ ] Can miners be merged to upgrade levels?
- [ ] Can a station be built on cleared plot at valid levels?
- [ ] Can trains be bought and assigned to platforms?
- [ ] Does trip timer work correctly?
- [ ] Does payout calculation include cart bonuses?
- [ ] Can destinations be discovered through exploration?

### State Management
- [ ] Does save/load preserve all state fields?
- [ ] Are plot IDs stable across saves?
- [ ] Do station references resolve to correct plots?
- [ ] Is world grid rendering consistent with state?

### UI/UX
- [ ] Is portrait-first layout working on mobile?
- [ ] Are tab navigation and screen switching smooth?
- [ ] Are all buttons enabled/disabled correctly based on state?
- [ ] Do tooltips and messages provide clear feedback?

---

## Success Criteria

Alpha 1 is considered successful when:

1. ✅ All three core slices (mines, station, world) are refactored into proper TypeScript modules
2. ✅ State model is complete and well-defined with all fields
3. ✅ Persistence layer uses localStorage with versioning and migration hooks
4. ✅ UI is portrait-first and mobile-optimized
5. ✅ All gameplay loops from MVP3 are preserved and working
6. ✅ Codebase is modular enough for parallel slice development

---