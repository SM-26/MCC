export interface AppContext {
  theme: 'light' | 'dark';
  isPWAInstalled: boolean;
  isLoading: boolean;
  splashVisible: boolean;
}

export interface GameState {
  currentWorld: number;
  mineLevel: number;
  settings: {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    notificationsEnabled: boolean;
  };
}

export interface NavigationState {
  activeTab: 'world' | 'mine' | 'settings';
  tabs: ('world' | 'mine' | 'settings')[];
}

export interface PWAInstallState {
  visible: boolean;
  shouldShow: boolean;
}
