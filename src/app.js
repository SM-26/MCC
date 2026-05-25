// ============================================================================
// Merge & Choo-Choo - Main Application Entry Point
// ============================================================================
// This file bootstraps the entire application and wires up all slices.
// It follows the modular monolith architecture defined in technical_architecture_doc.md
// ============================================================================

import { initWorldSlice } from './world.js';
import { initMinesSlice } from './mines.js';
import { initStationSlice } from './station.js';
import { initUISlice } from './ui.js';
import { initSaveSlice } from './save.js';
import { initPlatformSlice } from './platform.js';

// ============================================================================
// Application State (Single Source of Truth)
// ============================================================================
const appState = {
  currentTab: 'world',
  devMode: false,
  version: null,
  commitHash: null,
  commitMessage: null,
  navPosition: 'bottom' // 'top' or 'bottom'
};

// ============================================================================
// DOM Elements Cache
// ============================================================================
const dom = {
  splash: document.getElementById('splash'),
  app: document.getElementById('app'),
  worldGrid: document.getElementById('world-grid'),
  minesContainer: document.getElementById('mines-container'),
  stationContainer: document.getElementById('station-container'),
  settingsSections: document.querySelectorAll('.settings-section'),
  navBar: document.getElementById('nav-bar'),
  toast: document.getElementById('toast'),
  
  // Settings elements
  appVersion: document.getElementById('app-version'),
  commitHash: document.getElementById('commit-hash'),
  themeToggle: document.getElementById('themeToggle'),
  resetSaveData: document.getElementById('resetSaveData'),
  navToggle: document.getElementById('navToggle'),
  devModeToggle: document.getElementById('devModeToggle')
};

// ============================================================================
// Application Initialization
// ============================================================================
async function init() {
  console.log('[App] Initializing Merge & Choo-Choo...');
  
  // Initialize platform slice first (runtime adapters)
  await initPlatformSlice();
  
  // Load version and commit info
  await loadAppInfo();
  
  // Initialize slices in dependency order
  await initSaveSlice();      // Persistence layer first
  await initWorldSlice();     // World generation
  await initMinesSlice();     // Mining systems
  await initStationSlice();   // Station/logistics systems
  
  // Initialize UI (navigation, tabs, etc.)
  initUISlice();
  
  // Setup event listeners
  setupEventListeners();
  
  // Hide splash screen after load
  setTimeout(() => {
    dom.splash.style.display = 'none';
    dom.app.style.display = 'block';
  }, 1000);
  
  console.log('[App] Initialization complete');
}

// ============================================================================
// Load Version and Commit Info
// ============================================================================
async function loadAppInfo() {
  try {
    // Read package.json for version (Vite serves from /MCC/)
    const packageResponse = await fetch('/MCC/package.json');
    if (packageResponse.ok) {
      const packageData = await packageResponse.json();
      appState.version = packageData.version || 'unknown';
    } else {
      appState.version = 'unknown';
    }

    // Read git-info.txt for commit hash and message (Vite serves from /MCC/)
    try {
      const gitResponse = await fetch('/MCC/git-info.txt');
      if (gitResponse.ok) {
        const gitInfo = await gitResponse.text();
        const lines = gitInfo.trim().split('\n');
        appState.commitHash = lines[0] || 'unknown';
        appState.commitMessage = lines[1] || '';
        
        // Make commit hash clickable to show message
        dom.commitHash.innerHTML = `
          <span class="hash-value" contenteditable="true">${appState.commitHash}</span>
          <span class="hash-message">${appState.commitMessage}</span>
        `;
      } else {
        appState.commitHash = 'abc123def';
        appState.commitMessage = 'Initial commit';
        dom.commitHash.innerHTML = `
          <span class="hash-value" contenteditable="true">${appState.commitHash}</span>
          <span class="hash-message">${appState.commitMessage}</span>
        `;
      }
    } catch (error) {
      console.log('Using fallback commit info');
      appState.commitHash = 'abc123def';
      appState.commitMessage = 'Initial commit';
      dom.commitHash.innerHTML = `
        <span class="hash-value" contenteditable="true">${appState.commitHash}</span>
        <span class="hash-message">${appState.commitMessage}</span>
      `;
    }

    // Update UI with loaded info - version always visible
    dom.appVersion.textContent = appState.version;
    
  } catch (error) {
    console.error('[App] Error loading app info:', error);
    appState.version = 'unknown';
    appState.commitHash = 'unknown';
    dom.appVersion.textContent = 'unknown';
    dom.commitHash.textContent = 'unknown';
  }
}

// ============================================================================
// Setup Event Listeners
// ============================================================================
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active tab
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show corresponding content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab) {
          content.classList.add('active');
        }
      });
      
      appState.currentTab = targetTab;
    });
  });

  // Reset save data button
  dom.resetSaveData?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all save data? This cannot be undone!')) {
      localStorage.clear();
      showToast('Save data has been reset');
    }
  });

  // Theme toggle (placeholder)
  dom.themeToggle?.addEventListener('click', () => {
    showToast('Theme toggle not yet implemented');
  });

  // Navigation bar toggle
  dom.navToggle?.addEventListener('click', () => {
    dom.navBar.classList.toggle('nav-bottom');
    appState.navPosition = dom.navBar.classList.contains('nav-bottom') ? 'bottom' : 'top';
  });

  // Dev mode toggle (placeholder)
  dom.devModeToggle?.addEventListener('change', (e) => {
    appState.devMode = e.target.checked;
    // Dev Mode is now just a placeholder - doesn't affect any display
  });

  // Commit hash click handler
  dom.commitHash?.querySelectorAll('.hash-value').forEach(hashElement => {
    hashElement.addEventListener('click', () => {
      const hash = hashElement.textContent;
      showToast(`Commit: ${hash}`);
      if (appState.commitMessage) {
        showToast(appState.commitMessage);
      }
    });
  });
}

// ============================================================================
// Toast Notification System
// ============================================================================
function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  
  // Remove after 3 seconds
  setTimeout(() => {
    dom.toast.classList.remove('show');
  }, 3000);
}

// ============================================================================
// Bootstrap Application
// ============================================================================
document.addEventListener('DOMContentLoaded', init);
