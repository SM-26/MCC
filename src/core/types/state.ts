// src/core/types/state.ts

export interface GameState {
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
  version: number;            // save format version (1 for Alpha 1)
  lastSaveTime: number;       // timestamp of last save
}

export interface Plot {
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

export interface Tile {
  level: number;              // terrain depth (1, -1, -2, etc.)
  type: 'empty' | 'rubble' | 'dirt' | 'coal' | 'oil' | 'copper' | 'super-alloy';
  
  // Health system
  hp: number;                 // current health (0 = destroyed)
  maxHp: number;              // max health
  
  // Value when mined
  value: number;              // money value
  resourceType: null | 'coal' | 'oil' | 'copper' | 'super-alloy';
}

export interface Miner {
  level: number;
  tileIndex: number;
  facing: number;             // 0, 90, 180, 270
}

export interface Station {
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

export interface Platform {
  id: string;
  level: number;              // 1, 6, 11, 16...
  train: Train | null;
}

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

export interface WorldCell {
  id: string;
  name: string;
  type: 'fog' | 'plot' | 'city' | 'factory';
  
  // Axial hex coordinates
  q: number;
  r: number;
  
  discovered: boolean;
}

export interface Destination {
  id: string;
  name: string;
  type: 'city' | 'factory';
  distance: number;
  basePayout: number;
  discovered: boolean;
}
