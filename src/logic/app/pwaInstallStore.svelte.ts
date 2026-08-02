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

// Registered at module scope, not in a component's onMount: `beforeinstallprompt`
// can fire before the app has mounted, and the install UI has to outlive the
// splash screen. Wiring it to a component that unmounts is how the prompt got
// lost, the event would land after the splash was gone, with nothing rendering.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the event so the install can be triggered later, from our own button.
    event.preventDefault();
    pwaInstallStore.setDeferredPrompt(event as BeforeInstallPromptEvent);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone && pwaInstallStore.current.shouldShow) {
      pwaInstallStore.setVisible(true);
    }
  });

  window.addEventListener('appinstalled', () => {
    pwaInstallStore.markInstalled();
  });
}
