// src/types.ts
export const TabsList = ['world', 'mine', 'station', 'engineeringIdeas', 'settings'] as const;
export type TabId = (typeof TabsList)[number];
export type NavPosition = 'top' | 'bottom' | 'left' | 'right' | 'hidden';
export type Themes = 'dark' | 'light' | 'system' | 'user';
export type DestinationTypes = 'city' | 'factory' | 'plot';
export type ResourcesType = 'none' | 'money' | 'coal' | 'oil' | 'copper' | 'superalloy';
export type MineTileType = 'empty' | 'dirt' | 'blocker' | 'rubble' | 'coal' | 'oil' | 'copper' | 'superalloy';
export type ScreenSizes = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Ages = 'Mechanical' | 'Steam' | 'Diesel' | 'Electric' | 'Maglev';

export type cartTypes = 'simple' | 'double deckers' | `laxury` | 'cargo' | 'better cargo' | `best cargo`;

export interface AppContext {
  isPWAInstalled: boolean;
  isLoading: boolean;
  splashVisible: boolean;
  screenSize: ScreenSizes;
}
export interface SaveFile {
  meta: SaveMetadata;
  data: PersistedGameState;
}
export type SavedNavigation = {
  activeTab: TabId;
};

export type PersistedGameState = GameState & {
  navigation: SavedNavigation;
};
export interface GameState {
  //Player data
  money: number;
  world: WorldState;

  // Meta rogression
  meta: MetaState;

  settings: SettingsState;
}

export interface WorldState {
  // World map data
  cells: WorldCell[];

  // Player-developed plots
  plots: PlotState[];
  activePlotIndex: number;
}

export interface MetaState {
  engineeringIdeas: number; // EI points
  resetCount: number; // nuke count
  maxNorthExpansions: number; // Roman numeral count (0 = I, 1 = II)
  maxUndergroundLevels: number;
  // currentWorld: number; // I don't think we need this
  // mineLevel: number; // I don't think we need this
}

export interface SettingsState {
  navbarPosition: NavPosition;
  defaultView: 'world' | 'last-active';
  devMode: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  // appVersion: string; // change to saveVersion
  // commitHash: string; // change to saveCommitHash
  // commitMessage: string; // delete this line
  theme: Themes;
  worldSeed: string;
}

export interface SaveMetadata {
  saveVersion: string;
  saveCommitHash: string;
  savedAt: number;
}

export interface NavigationState {
  activeTab: TabId;
  tabs: TabId[];
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
  plotName: string;
  northExpansions: NorthExpansion[];
  activeNorthExpansionIndex: number;
  ageResources: {
    coal: number;
    oil: number;
    copper: number;
    superAlloy: number;
  };
  currentAge: Ages;
  station: Station | null;
}

export interface NorthExpansion {
  mineDepths: MineDepth[];
  selectedMiner: Miner | null;
  draggedMiner: Miner | null;
  lastTick: number;
  activeDepthIndex: number;
}

export interface MineDepth {
  depth: number;
  rows: number; // Grid dimensions (e.g., 5)
  cols: number; // Grid dimensions (e.g., 5)
  tiles: MineTile[][]; // 2D grid: [row][column]
  miners: Miner[];
}

export interface MineTile {
  type: MineTileType;
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
  progress: number; // I don't think we really need this.
}

// Stations
export interface Station {
  id: string; // e.g., "station-plot-A-II-u1"
  plotId: string; // To delete later

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
  northExpansionIndex: number;
  depth: number;
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
  cartType: cartTypes;
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
