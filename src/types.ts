export type TabId = 'world' | 'mines' | 'station' | 'engineeringIdeas' | 'settings';
export type NavPosition = 'top' | 'bottom';
export type DestinationTypes = 'city' | 'factory' | 'plot';
export type ResorcesType = 'money' | 'coal' | 'oil' | 'copper' | 'super-alloy';
export type Ages = 'Mechanical' | 'Steam' | 'Disel' | 'Electice' | 'Maglev';

export interface AppContext {
  // theme: 'light' | 'dark' | 'system' | 'blue'; // we have this in the GameState.
  isPWAInstalled: boolean;
  isLoading: boolean;
  splashVisible: boolean;
}

export interface GameState {
  //Player data
  money: number;
  mines: MinesState;

  // Meta rogression
  meta: {
    engineeringIdeas: number;   // EI points
    resetCount: number;         // nuke count
    MaxnorthExpansions: number;    // Roman numeral count (0 = I, 1 = II)
    MaxundergroundLevels: number;
  }
  // currentWorld: number; // I don't think we need this
  // mineLevel: number; // I don't think we need this
  settings: {
    navbarPosition: 'top' | 'bottom'; // | 'left' | 'right';
    devMode: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    appVersion: string;
    commitHash: string;
    theme: 'light' | 'dark' | 'system' | 'blue';
    worldSeed?: string;
  };
}

export interface NavigationState {
  activeTab: TabId;
  tabs: TabId[];
}

export interface PWAInstallState {
  visible: boolean;
  shouldShow: boolean;
}

// Mines

export interface PlotState {
  plotid: string;
  // maxUnlockedPlot: number; // what is this for?
  plots: MinesState[]; // each mine in the plot is a new north Expansion.

  // Age progression
  ageResources: {
    coal: number;
    oil: number;
    copper: number;
    superAlloy: number;
  };
  currentAge: Ages;    // e.g., "basic"

  // Station info
  stations: Station | null;
}

export interface MinesState {
  activePlot: number;
  // maxUnlockedPlot: number;
  plots: MinePlot[];
  selectedMiner: Miner | null;
  draggedMiner: Miner | null;
  lastTick: number;
}

export interface MinePlot {
  depth: number;
  tiles: MineTile[];
  miners: Miner[];
  platform: Platform | null;
}

export interface MineTile {
  type: 'empty' | 'rubble' | 'dirt' | 'blocker'; // | 'coal' | 'oil' | 'copper' | 'superalloy' 
  level: number;
  hp: number;
  maxHp: number;
  value: number;
  resourceType: ResorcesType;
}

export interface Miner {
  level: number;
  tileIndex: number;
  facing: number;
  // progress: number; // I don't think we really nned this.
}

// Stations

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
  engineAge: Ages;
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
  destinationType: DestinationTypes;
}

// World

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
  type: DestinationTypes;
  distance: number;
  basePayout: number;
  discovered: boolean;
}
