<script lang="ts">
  import { onMount } from "svelte";
  import { navigation, appContext, gameState } from "$stores/index";
  import WorldView from "../views/WorldView.svelte";
  // import MineView from "./MineView.svelte";
  // import SettingsView from "./SettingsView.svelte";

  // This will run every time navigation.activeTab changes
  $effect(() => {
    console.log("Tab changed to:", $navigation.activeTab);
  });

  let activeTab = $derived($navigation.activeTab);
  let isLargeScreen = $derived(window.innerWidth >= 768);

  const tabLabels: Record<string, string> = {
    world: "World",
    mine: "Mine",
    settings: "Settings",
  };

  // Placeholder content for each tab
  function renderWorldContent() {
    return `
      <main class="content-section">
        <div class="section-header">
          <h2>🌍 World Map</h2>
          <p class="section-subtitle">Explore different worlds and discover new territories</p>
        </div>

        <div class="world-grid">
          <article class="world-card" aria-label="World 1 - Starting Area">
            <div class="world-icon">🌍</div>
            <h3>World 1</h3>
            <p>The starting world. Basic resources and simple terrain.</p>
            <div class="world-stats">
              <span class="stat">Level: ${gameState.currentWorld}</span>
              <span class="stat">Size: Small</span>
            </div>
          </article>

          <article class="world-card" aria-label="World 2 - Forest Region">
            <div class="world-icon">🌲</div>
            <h3>World 2</h3>
            <p>Lush forests with abundant timber resources.</p>
            <div class="world-stats">
              <span class="stat">Level: ${gameState.currentWorld + 1}</span>
              <span class="stat">Size: Medium</span>
            </div>
          </article>

          <article class="world-card" aria-label="World 3 - Mountain Region">
            <div class="world-icon">⛰️</div>
            <h3>World 3</h3>
            <p>Majestic mountains with rare minerals.</p>
            <div class="world-stats">
              <span class="stat">Level: ${gameState.currentWorld + 2}</span>
              <span class="stat">Size: Large</span>
            </div>
          </article>

          <article class="world-card" aria-label="World 4 - Desert Region">
            <div class="world-icon">🏜️</div>
            <h3>World 4</h3>
            <p>Hot deserts with precious gems.</p>
            <div class="world-stats">
              <span class="stat">Level: ${gameState.currentWorld + 3}</span>
              <span class="stat">Size: Extra Large</span>
            </div>
          </article>
        </div>

        <div class="action-bar">
          <button class="btn-primary" onclick={() => alert('World generation in progress...')}>
            Generate New World
          </button>
          <button class="btn-secondary" onclick={() => alert('Traveling to next world...')}>
            Travel to Next World
          </button>
        </div>
      </main>
    `;
  }

  function renderMineContent() {
    return `
      <main class="content-section">
        <div class="section-header">
          <h2>⛏️ Mine Operations</h2>
          <p class="section-subtitle">Manage your mining operations and extract resources</p>
        </div>

        <div class="mine-layout">
          <!-- Mine Status -->
          <aside class="mine-status">
            <div class="status-card">
              <h3>Mine Level</h3>
              <div class="level-display">${gameState.mineLevel}</div>
              <p>Current extraction capacity</p>
            </div>

            <div class="resource-list">
              <div class="resource-item">
                <span class="resource-icon">🪨</span>
                <span class="resource-name">Stone</span>
                <span class="resource-amount">1,234</span>
              </div>
              <div class="resource-item">
                <span class="resource-icon">🌲</span>
                <span class="resource-name">Wood</span>
                <span class="resource-amount">567</span>
              </div>
              <div class="resource-item">
                <span class="resource-icon">⛽</span>
                <span class="resource-name">Oil</span>
                <span class="resource-amount">89</span>
              </div>
            </div>
          </aside>

          <!-- Mine Controls -->
          <section class="mine-controls">
            <h3>Mine Management</h3>
            
            <div class="action-buttons">
              <button class="btn-primary" onclick={() => alert('Starting mining operation...')}>
                Start Mining
              </button>
              
              <button class="btn-secondary" onclick={() => {
                const newLevel = $gameState.mineLevel + 1;
                $gameState.mineLevel = newLevel;
              }}>
                Upgrade Mine
              </button>
            </div>

            <div class="mine-options">
              <h4>Mining Options</h4>
              
              <label class="toggle-label">
                <input type="checkbox" checked />
                <span class="toggle-text">Auto-mine</span>
              </label>

              <label class="toggle-label">
                <input type="checkbox" checked />
                <span class="toggle-text">Sound Effects</span>
              </label>

              <label class="toggle-label">
                <input type="checkbox" checked />
                <span class="toggle-text">Vibration</span>
              </label>
            </div>
          </section>
        </div>
      </main>
    `;
  }

  function renderSettingsContent() {
    return `
      <main class="content-section">
        <div class="section-header">
          <h2>⚙️ Settings</h2>
          <p class="section-subtitle">Customize your experience</p>
        </div>

        <div class="settings-grid">
          <!-- Appearance -->
          <section class="settings-card" aria-labelledby="appearance-heading">
            <h3 id="appearance-heading">Appearance</h3>
            
            <div class="setting-item">
              <label for="theme-toggle">Theme</label>
              <select id="theme-toggle" class="setting-select">
                <option value="dark" selected>Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>

            <div class="setting-item">
              <label for="font-size">Font Size</label>
              <select id="font-size" class="setting-select">
                <option value="small">Small</option>
                <option value="medium" selected>Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </section>

          <!-- Audio -->
          <section class="settings-card" aria-labelledby="audio-heading">
            <h3 id="audio-heading">Audio</h3>
            
            <div class="setting-item toggle-setting">
              <label for="sound-toggle">Sound Effects</label>
              <input 
                type="checkbox" 
                id="sound-toggle" 
                checked 
                aria-checked="true"
              />
            </div>

            <div class="setting-item toggle-setting">
              <label for="music-toggle">Background Music</label>
              <input 
                type="checkbox" 
                id="music-toggle" 
                checked 
                aria-checked="true"
              />
            </div>
          </section>

          <!-- Notifications -->
          <section class="settings-card" aria-labelledby="notifications-heading">
            <h3 id="notifications-heading">Notifications</h3>
            
            <div class="setting-item toggle-setting">
              <label for="push-toggle">Push Notifications</label>
              <input 
                type="checkbox" 
                id="push-toggle" 
                checked 
                aria-checked="true"
              />
            </div>

            <div class="setting-item toggle-setting">
              <label for="vibration-toggle">Vibration</label>
              <input 
                type="checkbox" 
                id="vibration-toggle" 
                checked 
                aria-checked="true"
              />
            </div>
          </section>

          <!-- About -->
          <section class="settings-card" aria-labelledby="about-heading">
            <h3 id="about-heading">About</h3>
            
            <div class="setting-item">
              <label>Version</label>
              <span class="setting-value">1.0.0</span>
            </div>

            <div class="setting-item">
              <label>Built with</label>
              <span class="setting-value">Svelte + Vite</span>
            </div>

            <button class="btn-secondary" onclick={() => window.open('https://github.com', '_blank')}>
              View Source Code
            </button>
          </section>
        </div>
      </main>
    `;
  }
</script>

<div class="main-content">
  {#if activeTab === "world"}
    <WorldView />
  {:else if activeTab === "mine"}{:else if activeTab === "settings"}{:else}
    <p style="color: blue;">No matching tab found!</p>
  {/if}
</div>

<!-- <div class="tab-content">
  {#if activeTab === "world"}
    <main class="content-section">
      <div class="section-header">
        <h2>🌍 World Map</h2>
        <p class="section-subtitle">
          Explore different worlds and discover new territories
        </p>
      </div>
      <div class="world-grid">
        <article class="world-card">
          <h3>World 1</h3>
        </article>
      </div>
    </main>
  {:else if activeTab === "mine"}
    <main class="content-section"></main>
  {:else if activeTab === "settings"}
    <main class="content-section">
      <div class="section-header">
        <h2>⚙️ Settings</h2>
        <p class="section-subtitle">Customize your experience</p>
      </div>

      <div class="settings-grid">
        <section class="settings-card">
          <h3>Appearance</h3>
          <div class="setting-item">
            <label for="theme-toggle">Theme</label>
            <select id="theme-toggle" class="setting-select">
              <option value="dark" selected>Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </section>
      </div>
    </main>
  {/if}
</div> -->

<style>
  .content-section {
    padding: var(--md-sys-spacing-lg);
    animation: fadeIn 0.3s ease-out;
  }

  .section-header {
    margin-bottom: var(--md-sys-spacing-lg);
  }

  .section-header h2 {
    font-size: var(--md-sys-typescale-headline-large);
    color: var(--md-sys-color-on-background);
    margin: 0 0 var(--md-sys-spacing-xs) 0;
  }

  .section-subtitle {
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
    margin: 0;
  }

  /* World Grid */
  .world-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--md-sys-spacing-md);
    margin-bottom: var(--md-sys-spacing-lg);
  }

  .world-card {
    background-color: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: var(--md-sys-spacing-md);
    text-align: center;
    transition:
      transform var(--md-sys-transition-fast),
      box-shadow var(--md-sys-transition-fast);
  }

  .world-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--md-sys-elevation-2);
  }

  .world-icon {
    font-size: 64px;
    margin-bottom: var(--md-sys-spacing-sm);
  }

  .world-card h3 {
    font-size: var(--md-sys-typescale-title-large);
    color: var(--md-sys-color-on-background);
    margin: 0 0 var(--md-sys-spacing-xs) 0;
  }

  .world-card p {
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 var(--md-sys-spacing-md) 0;
  }

  .world-stats {
    display: flex;
    justify-content: center;
    gap: var(--md-sys-spacing-sm);
  }

  .stat {
    font-size: var(--md-sys-typescale-label-large);
    color: var(--md-sys-color-on-surface-variant);
    background-color: var(--md-sys-color-surface-container-high);
    padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
    border-radius: var(--md-sys-shape-corner-full);
  }

  .action-bar {
    display: flex;
    gap: var(--md-sys-spacing-md);
    justify-content: center;
  }

  /* Mine Layout */
  .mine-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--md-sys-spacing-lg);
  }

  .mine-status {
    background-color: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: var(--md-sys-spacing-md);
  }

  .status-card {
    text-align: center;
    margin-bottom: var(--md-sys-spacing-md);
  }

  .status-card h3 {
    font-size: var(--md-sys-typescale-label-large);
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 var(--md-sys-spacing-sm) 0;
  }

  .level-display {
    font-size: var(--md-sys-typescale-headline-large);
    color: var(--md-sys-color-primary);
    margin: 0;
  }

  .resource-list {
    display: flex;
    flex-direction: column;
    gap: var(--md-sys-spacing-sm);
  }

  .resource-item {
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-sm);
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
  }

  .resource-icon {
    font-size: 24px;
  }

  .mine-controls h3 {
    font-size: var(--md-sys-typescale-title-large);
    color: var(--md-sys-color-on-background);
    margin: 0 0 var(--md-sys-spacing-md) 0;
  }

  .action-buttons {
    display: flex;
    gap: var(--md-sys-spacing-sm);
    margin-bottom: var(--md-sys-spacing-md);
  }

  .mine-options h4 {
    font-size: var(--md-sys-typescale-label-large);
    color: var(--md-sys-color-on-background);
    margin: 0 0 var(--md-sys-spacing-sm) 0;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--md-sys-spacing-sm);
    background-color: var(--md-sys-color-surface-container-high);
    border-radius: var(--md-sys-shape-corner-medium);
    margin-bottom: var(--md-sys-spacing-xs);
  }

  .toggle-label input[type="checkbox"] {
    appearance: none;
    width: 52px;
    height: 32px;
    background-color: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-full);
    position: relative;
    cursor: pointer;
    transition: background-color var(--md-sys-transition-fast);
  }

  .toggle-label input[type="checkbox"]::after {
    content: "";
    position: absolute;
    width: 28px;
    height: 28px;
    border-radius: var(--md-sys-shape-corner-full);
    background-color: var(--md-sys-color-on-surface-container);
    top: 2px;
    left: 2px;
    transition: transform var(--md-sys-transition-fast);
  }

  .toggle-label input[type="checkbox"]:checked {
    background-color: var(--md-sys-color-primary);
  }

  .toggle-label input[type="checkbox"]:checked::after {
    transform: translateX(20px);
    background-color: var(--md-sys-color-on-primary);
  }

  .toggle-label .toggle-text {
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
  }

  /* Settings Grid */
  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--md-sys-spacing-md);
  }

  .settings-card {
    background-color: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: var(--md-sys-spacing-md);
  }

  .settings-card h3 {
    font-size: var(--md-sys-typescale-title-large);
    color: var(--md-sys-color-on-background);
    margin: 0 0 var(--md-sys-spacing-lg) 0;
    padding-bottom: var(--md-sys-spacing-sm);
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--md-sys-spacing-md);
  }

  .setting-item:last-child {
    margin-bottom: 0;
  }

  .setting-item label {
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
  }

  .setting-select {
    padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
    border: 1px solid var(--md-sys-color-outline);
    border-radius: var(--md-sys-shape-corner-medium);
    background-color: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-background);
    font-size: var(--md-sys-typescale-body-large);
    min-width: 150px;
  }

  .setting-value {
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
  }

  .toggle-setting label {
    cursor: pointer;
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 767px) {
    .content-section {
      padding: var(--md-sys-spacing-sm);
    }

    .world-grid,
    .mine-layout,
    .settings-grid {
      grid-template-columns: 1fr;
    }

    .action-bar {
      flex-direction: column;
    }

    .action-buttons {
      flex-direction: column;
    }
  }
</style>
