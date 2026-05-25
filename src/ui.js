// UI Slice - Layout, navigation, screen composition, user input translation

// Internal DOM Cache isolated within the UI slice
let dom = {};

export function initUISlice(appState) {
  console.log('[UI] Initializing UI slice...');

  // 1. Cache elements needed specifically by the UI layer
  dom = {
    splash: document.getElementById('splash'),
    app: document.getElementById('app'),
    navBar: document.getElementById('nav-bar'),
    toast: document.getElementById('toast'),
    navToggle: document.getElementById('navToggle'),
    tabs: document.querySelectorAll('.nav-tab'),
    contents: document.querySelectorAll('.tab-content')
  };

  // Set initial navigation layout class based on appState on load
  if (appState.navPosition === 'bottom') {
    dom.navBar?.classList.add('nav-bottom');
    updateToggleButtonText(true);
  } else {
    dom.navBar?.classList.remove('nav-bottom');
    updateToggleButtonText(false);
  }

  // 2. Setup internal layout & navigation systems
  setupNavigation(appState);
  setupUILayoutToggles(appState);

  // 3. Transition from splash screen to app view
  setTimeout(() => {
    dom.splash.style.display = 'none';
    dom.app.style.display = 'block';
  }, 1000);
}

// Handles switching tabs seamlessly
function setupNavigation(appState) {
  dom.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update DOM button active classes
      dom.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Toggle view pane visibility
      dom.contents.forEach(content => {
        content.classList.toggle('active', content.id === targetTab);
      });
      
      // Sync layout changes safely back to global state
      appState.currentTab = targetTab;
    });
  });
}

// Handles visual layouts like moving the navigation rail/bar positions
function setupUILayoutToggles(appState) {
  dom.navToggle?.addEventListener('click', () => {
    // Toggle the nav-bottom class on the navbar container
    const isBottom = dom.navBar.classList.toggle('nav-bottom');
    
    // Sync the state
    appState.navPosition = isBottom ? 'bottom' : 'top';
    
    // Update the button text
    updateToggleButtonText(isBottom);
    
    // REPLACED TOAST WITH DEBUG LOG
    console.log(`[Debug] UI Layout Mutation: nav-bar shifted to position: ${appState.navPosition}`);
  });
}

// Helper to update toggle button descriptor text accurately
function updateToggleButtonText(isBottom) {
  const buttonText = dom.navToggle?.querySelector('.text');
  if (buttonText) {
    buttonText.textContent = isBottom ? 'Move Nav Up' : 'Move Nav Down';
  }
}

// Global UI Toast Controller
export function showToast(message) {
  if (!dom.toast) dom.toast = document.getElementById('toast');
  
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  
  setTimeout(() => {
    dom.toast.classList.remove('show');
  }, 3000);
}