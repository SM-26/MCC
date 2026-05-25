// App state
const appState = {
  currentTab: 'world',
  devMode: false,
  version: '1.0.0', // Hardcoded for now
  commitHash: '4c9ecef', // Hardcoded for now
  commitMessage: 'Ignore Windows Zone.Identifier metadata files' // Hardcoded for now
};

// DOM Elements
const splashScreen = document.getElementById('splash');
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const resetSaveButton = document.getElementById('reset-save');
const devModeToggle = document.getElementById('dev-mode-toggle');
const appVersionElement = document.getElementById('app-version');
const commitHashElement = document.getElementById('commit-hash');
const toast = document.getElementById('toast');
const navBar = document.getElementById('nav-bar');
const navToggleBtn = document.getElementById('nav-toggle');

// Initialize app
async function init() {
  setupTabNavigation();
  setupResetSaveButton();
  setupDevModeToggle();
  setupNavBarToggle();
  setupCommitHashClick();
  setupThemeToggle();
  loadAppInfo();
  showSplashScreen();
}

// Load version and commit info from package.json and git-info.txt
async function loadAppInfo() {
  try {
    // Read package.json for version using fetch
    const packageResponse = await fetch('/package.json');
    if (packageResponse.ok) {
      const packageData = await packageResponse.json();
      appState.version = packageData.version || 'unknown';
    } else {
      appState.version = 'unknown';
    }

    // Read git-info.txt for commit hash and message using fetch
    try {
      const gitResponse = await fetch('/git-info.txt');
      if (gitResponse.ok) {
        const gitInfo = await gitResponse.text();
        const lines = gitInfo.trim().split('\n');
        appState.commitHash = lines[0] || 'unknown';
        appState.commitMessage = lines[1] || '';
        
        // Make commit hash clickable to show message
        commitHashElement.innerHTML = `<span class="commit-hash-link" data-hash="${appState.commitHash}">${appState.commitHash}</span>`;
      } else {
        // Fallback: generate a placeholder commit hash
        appState.commitHash = 'abc123def';
        appState.commitMessage = 'Initial commit';
        commitHashElement.innerHTML = `<span class="commit-hash-link" data-hash="${appState.commitHash}">${appState.commitHash}</span>`;
      }
    } catch (error) {
      // Fallback if git-info.txt not available
      console.log('Using fallback commit info');
      appState.commitHash = 'abc123def';
      appState.commitMessage = 'Initial commit';
      commitHashElement.innerHTML = `<span class="commit-hash-link" data-hash="${appState.commitHash}">${appState.commitHash}</span>`;
    }

    // Update UI with loaded info - version always visible
    appVersionElement.textContent = appState.version;
    
  } catch (error) {
    console.error('Error loading app info:', error);
    appState.version = 'unknown';
    appState.commitHash = 'unknown';
    appVersionElement.textContent = 'unknown';
    commitHashElement.textContent = 'unknown';
  }
}

// Setup tab navigation
function setupTabNavigation() {
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active tab
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show corresponding content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab) {
          content.classList.add('active');
        }
      });
      
      appState.currentTab = targetTab;
    });
  });
}

// Setup reset save button
function setupResetSaveButton() {
  resetSaveButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all save data? This cannot be undone!')) {
      localStorage.clear();
      showToast('Save data has been reset');
    }
  });
}

// Setup dev mode toggle (now just a placeholder, doesn't affect display)
function setupDevModeToggle() {
  devModeToggle.addEventListener('change', (e) => {
    appState.devMode = e.target.checked;
    // Dev Mode is now just a placeholder - doesn't affect any display
  });
}

// Setup commit hash click handler
function setupCommitHashClick() {
  const commitHashLinks = document.querySelectorAll('.commit-hash-link');
  commitHashLinks.forEach(link => {
    link.addEventListener('click', () => {
      const hash = link.dataset.hash;
      showToast(`Commit: ${hash}`);
      if (appState.commitMessage) {
        showToast(appState.commitMessage);
      }
    });
  });
}

// Setup nav bar toggle
function setupNavBarToggle() {
  navToggleBtn.addEventListener('click', () => {
    navBar.classList.toggle('nav-bottom');
    navToggleBtn.classList.toggle('active');
  });
}

// Setup theme toggle (placeholder for now)
function setupThemeToggle() {
  const themeToggleBtn = document.querySelector('.theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      showToast('Theme toggle not yet implemented');
    });
  }
}

// Show splash screen (initially visible, will be hidden after load)
function showSplashScreen() {
  // Simulate loading time (replace with actual app initialization)
  setTimeout(() => {
    splashScreen.classList.add('hidden');
  }, 1500); // 1.5 seconds loading time
}

// Show toast notification
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
