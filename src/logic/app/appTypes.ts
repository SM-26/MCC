// src/logic/app/appTypes.ts

import type { ScreenSize } from '../../lib/sizes';

export interface AppContext {
  isPWAInstalled: boolean; // default: false
  isLoading: boolean; // default: false
  splashVisible: boolean; // default: true on boot, then false
  screenSize: ScreenSize;
}

export interface PWAInstallState {
  visible: boolean; // default: false
  shouldShow: boolean; // default: false
}
