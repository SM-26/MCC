export const TabsList = ['world', 'mine', 'station', 'engineeringIdeas', 'settings'] as const;

export type TabId = (typeof TabsList)[number];
export type NavPosition = 'top' | 'bottom'; // | 'left' | 'right' | 'hidden'
export type Themes = 'dark' | 'light' | 'system' | 'user';
export type DestinationTypes = 'city' | 'factory' | 'plot';
export type ResourcesType = 'money' | 'coal' | 'oil' | 'copper' | 'super-alloy';
export type Ages = 'Mechanical' | 'Steam' | 'Diesel' | 'Electric' | 'Maglev';

export interface AppContext {
  isPWAInstalled: boolean;
  isLoading: boolean;
  splashVisible: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface GameState {
  //Player data
  money: number;
  mines: MinesState;

  // Meta rogression
  meta: {
    engineeringIdeas: number; // EI points
    resetCount: number; // nuke count
    MaxnorthExpansions: number; // Roman numeral count (0 = I, 1 = II)
    MaxundergroundLevels: number;
  };
  // currentWorld: number; // I don't think we need this
  // mineLevel: number; // I don't think we need this
  settings: {
    navbarPosition: NavPosition;
    devMode: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    appVersion: string;
    commitHash: string;
    theme: Themes;
    worldSeed: string;
  };
}

export interface NavigationState {
  activeTab: TabId;
  tabs: TabId[];
  navbarPosition: NavPosition;
  showLabels: boolean; // Desktop mode (true = text labels, false = emojis only)
  showEmojis: boolean; // Emoji fallback (true = show emojis, false = hide)
  showActiveLabel: boolean; // Will be initialized in App.svelte based on screen size
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
  currentAge: Ages; // e.g., "basic"

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
  rows: number; // Grid dimensions (e.g., 5)
  cols: number; // Grid dimensions (e.g., 5)
  tiles: MineTile[][]; // 2D grid: [row][column]
  miners: Miner[]; // Keep as 1D array (miners tracked by tileIndex)
  platform: Platform | null;
}

export interface MineTile {
  type: 'empty' | 'rubble' | 'dirt' | 'blocker'; // | 'coal' | 'oil' | 'copper' | 'superalloy'
  level: number;
  hp: number;
  maxHp: number;
  value: number;
  resourceType: ResourcesType;
}

export interface Miner {
  level: number;
  tileIndex: number;
  facing: number;
  // progress: number; // I don't think we really nned this.
}

// Stations

export interface Station {
  id: string; // e.g., "station-plot-A-II-u1"
  plotId: string;

  // Platforms array
  platforms: Platform[];

  // Train yard inventory
  trainyardInventory: {
    engines: Record<string, number>; // by age
    carts: Record<string, number>; // by type
  };
}

export interface Platform {
  id: string;
  level: number; // 1, 6, 11, 16...
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
