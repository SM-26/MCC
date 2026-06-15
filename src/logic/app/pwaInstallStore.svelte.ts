// src/logic/app/pwaInstallStore.svelte.ts

export interface PwaInstallState {
  visible: boolean;
  shouldShow: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

function createDefaultPwaInstallState(): PwaInstallState {
  return {
    visible: false,
    shouldShow: true,
    deferredPrompt: null,
  };
}

export function createPwaInstallStore(initial?: Partial<PwaInstallState>) {
  const state = $state<PwaInstallState>({
    ...createDefaultPwaInstallState(),
    ...initial,
  });

  return {
    get current() {
      return state;
    },

    reset() {
      Object.assign(state, createDefaultPwaInstallState());
    },

    replace(next: PwaInstallState) {
      Object.assign(state, next);
    },

    setVisible(value: boolean) {
      state.visible = value;
    },

    setShouldShow(value: boolean) {
      state.shouldShow = value;
    },

    setDeferredPrompt(value: BeforeInstallPromptEvent | null) {
      state.deferredPrompt = value;
    },

    clearDeferredPrompt() {
      state.deferredPrompt = null;
    },

    markInstalled() {
      state.visible = false;
      state.shouldShow = false;
      state.deferredPrompt = null;
    },
  };
}

export const pwaInstallStore = createPwaInstallStore();
