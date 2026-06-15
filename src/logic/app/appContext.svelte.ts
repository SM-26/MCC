// src/logic/app/appContext.svelte.ts

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AppContextState {
  isPWAInstalled: boolean;
  isLoading: boolean;
  splashVisible: boolean;
  screenSize: ScreenSize;
}

function createDefaultAppContextState(): AppContextState {
  return {
    isPWAInstalled: false,
    isLoading: true,
    splashVisible: true,
    screenSize: 'md',
  };
}

export function createAppContextStore(initial?: Partial<AppContextState>) {
  const state = $state<AppContextState>({
    ...createDefaultAppContextState(),
    ...initial,
  });

  return {
    get current() {
      return state;
    },

    reset() {
      Object.assign(state, createDefaultAppContextState());
    },

    replace(next: AppContextState) {
      Object.assign(state, next);
    },

    setIsPWAInstalled(value: boolean) {
      state.isPWAInstalled = value;
    },

    setIsLoading(value: boolean) {
      state.isLoading = value;
    },

    setSplashVisible(value: boolean) {
      state.splashVisible = value;
    },

    setScreenSize(value: ScreenSize) {
      state.screenSize = value;
    },
  };
}

export const appContext = createAppContextStore();
