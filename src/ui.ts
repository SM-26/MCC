/**
 * ============================================================================
 * Merge & Choo-Choo - UI Slice
 * ============================================================================
 * Layout, navigation, screen composition, user input translation.
 * Thin presentation layer that projects domain state to DOM.
 * ============================================================================
 */

import { AppState, TabId } from '@/types/game';
import { handleBuyMiner } from './mines';
import { saveGameState } from './save';

/**
 * Internal DOM Cache isolated within the UI slice
 */
interface UIDomCache {
  splash: HTMLDivElement | null;
  app: HTMLDivElement | null;
  navBar: HTMLDivElement | null;
  toast: HTMLDivElement | null;
  navToggle: HTMLButtonElement | null;
  tabs: HTMLButtonElement[];
  contents: HTMLDivElement[];
}

let dom: UIDomCache = {
  splash: null,
  app: null,
  navBar: null,
  toast: null,
  navToggle: null,
  tabs: [],
  contents: [],
};

// Guard flag to bypass double listener bindings caused by environment re-execution
let isUIInitialized = false;

/**
 * Synchronizes visibility classes and styles for a specific tab
 * Unifies display management and cross-tab UI data requirements.
 */
function switchTabTo(targetTab: TabId, appState: AppState): void {
  // 1. Sync navigation button highlights
  for (let i = 0; i < dom.tabs.length; i++) {
    const tab = dom.tabs[i];
    tab.classList.toggle('active', tab.dataset.tab === targetTab);
  }

  // 2. Sync content container visibility rules
  for (let i = 0; i < dom.contents.length; i++) {
    const content = dom.contents[i];
    const isActive = content.id === targetTab;

    // Replace the toggle logic for classList
    content.classList.toggle('active', isActive);
    // Use the CSS display property cleanly
    content.style.display = isActive ? 'block' : 'none';
  }

  // 3. Keep tracking state alive
  appState.currentTab = targetTab;
  saveGameState(appState);

  // 4. WALLET SYNC: Force sub-header context to match global wallet on view load
  if (targetTab === 'mines') {
    const plotNameDisplay = document.getElementById('plot-name-display');
    const subMoneyDisplay = document.getElementById('money-display'); // If you still want money shown elsewhere

    if (plotNameDisplay) {
      plotNameDisplay.textContent = appState.mines.plotid;
    }

    if (subMoneyDisplay) {
      subMoneyDisplay.textContent = `$${Math.floor(appState.money).toLocaleString()}`;
    }
  }
}

/**
 * Initialize UI Slice
 * Sets up navigation, layout toggles, and transitions from splash screen.
 * @param appState - The shared application state object
 */
export function initUISlice(appState: AppState): void {
  console.log('[UI] Initializing UI slice...');

  // 1. Cache elements needed specifically by the UI layer (always pull fresh references on reload)
  dom = {
    splash: document.getElementById('splash') as HTMLDivElement | null,
    app: document.getElementById('app') as HTMLDivElement | null,
    navBar: document.getElementById('nav-bar') as HTMLDivElement | null,
    toast: document.getElementById('toast') as HTMLDivElement | null,
    navToggle: document.getElementById('navToggle') as HTMLButtonElement | null,
    tabs: Array.from(document.querySelectorAll('.nav-tab')) as HTMLButtonElement[],
    contents: Array.from(document.querySelectorAll('.tab-content')) as HTMLDivElement[],
  };

  // Set initial navigation layout class based on appState on load
  if (dom.navBar) {
    const isBottom = appState.navPosition === 'bottom';
    dom.navBar.classList.toggle('nav-bottom', isBottom);
    updateToggleButtonText(isBottom);
  }

  // INITIAL SYNCHRONIZATION: Force DOM layout trees to align with parsed save properties
  const startingTab = appState.currentTab || 'world';
  switchTabTo(startingTab, appState);

  // FAIL-SAFE CIRCUIT BREAKER: Stop duplicate event listeners from attaching if script environment fires twice
  if (isUIInitialized) {
    console.warn('[UI] Event listeners already bound. Skipping duplicate setup.');
    return;
  }
  isUIInitialized = true;

  // 1. Setup Global Event Delegation
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Event Delegation: This works even if the buttons are destroyed and recreated
    if (target.closest('#btn-buy-miner')) {
      handleBuyMiner(appState);
      console.log('[UI] Buy Miner clicked');
    }

    if (target.closest('#btn-buy-north')) {
      // handleBuyNorthPlot(appState);
    }

    if (target.closest('#btn-dig-down')) {
      // handleDigDeeper(appState);
    }
  });

  // 2. Setup internal layout & navigation event listener bindings
  setupNavigation(appState);
  setupUILayoutToggles(appState);

  // 3. Transition from splash screen to app view
  setTimeout(() => {
    if (dom.splash) dom.splash.style.display = 'none';
    if (dom.app) dom.app.style.display = 'flex';
  }, 1000);
}

/**
 * Handles switching tabs seamlessly
 * @param appState - The shared application state object
 */
function setupNavigation(appState: AppState): void {
  const tabs = dom.tabs;

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    tab.addEventListener('click', () => {
      // Validate or cast the data-tab to a valid TabId
      const targetTab = (tab.dataset.tab as TabId) || 'world';

      // Now this call is type-safe
      switchTabTo(targetTab, appState);
    });
  }
}

/**
 * Handles visual layouts like moving the navigation rail/bar positions
 * @param appState - The shared application state object
 */
function setupUILayoutToggles(appState: AppState): void {
  dom.navToggle?.addEventListener('click', () => {
    // Toggle the nav-bottom class on the navbar container
    const isBottom = dom.navBar?.classList.toggle('nav-bottom');

    // Sync the state (handle undefined case)
    const bottomValue = isBottom ?? false;
    appState.navPosition = bottomValue ? 'bottom' : 'top';

    // Update the button text
    updateToggleButtonText(bottomValue);

    // Debug log
    console.log(`[Debug] UI Layout Mutation: nav-bar shifted to position: ${appState.navPosition}`);
  });
}

/**
 * Helper to update toggle button descriptor text accurately
 * @param isBottom - Whether navigation bar is at bottom
 */
function updateToggleButtonText(isBottom: boolean): void {
  const buttonText = dom.navToggle?.querySelector('.text') as HTMLElement | null;
  if (buttonText) {
    buttonText.textContent = isBottom ? 'Move Nav Up' : 'Move Nav Down';
  }
}

/**
 * Global UI Toast Controller
 * @param message - Message to display in toast notification
 */
export function showToast(message: string): void {
  let toast: HTMLDivElement | null = dom.toast;
  if (!toast) {
    toast = document.getElementById('toast') as HTMLDivElement | null;
    dom.toast = toast;
  }

  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
  }

  setTimeout(() => {
    if (dom.toast) dom.toast.classList.remove('show');
  }, 3000);
}