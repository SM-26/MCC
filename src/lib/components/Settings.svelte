<script>
  const isOpen = $state(false);
  const theme = $state('dark');
  const navbarPosition = $state('top');
  const devMode = $state(false);
  const soundEnabled = $state(false);
  const notificationsEnabled = $state(true);
  
  const dispatch = createEventDispatcher();
  
  // Theme options
  const themeOptions = ['dark', 'light', 'system', 'user'];
  
  // Navbar position options
  const navPositionOptions = ['top', 'bottom'];
  
  function toggleTheme() {
    const currentIndex = themeOptions.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOptions.length;
    theme = themeOptions[nextIndex];
    dispatch('themeChange', theme);
  }
  
  function toggleNavbarPosition() {
    const currentIndex = navPositionOptions.indexOf(navbarPosition);
    const nextIndex = (currentIndex + 1) % navPositionOptions.length;
    navbarPosition = navPositionOptions[nextIndex];
    dispatch('navPositionChange', navbarPosition);
  }
  
  function toggleDevMode() {
    devMode = !devMode;
    dispatch('devModeChange', devMode);
  }
  
  function toggleSound() {
    soundEnabled = !soundEnabled;
    dispatch('soundChange', soundEnabled);
  }
  
  function toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;
    dispatch('notificationsChange', notificationsEnabled);
  }
</script>

<div class="settings-container">
  <div class="settings-header">
    <h2>Settings</h2>
    <button class="close-btn" on:click={() => isOpen = false}>×</button>
  </div>
  
  <div class="settings-content">
    <!-- Theme Selection -->
    <div class="setting-group">
      <label class="setting-label">Theme</label>
      <div class="setting-controls">
        <div class="circular-nav">
          {#each themeOptions as opt (opt)}
            <button
              class="theme-option {theme === opt ? 'active' : ''}"
              on:click={() => theme = opt}
              aria-pressed={theme === opt}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          {/each}
        </div>
        <button class="icon-btn" on:click={toggleTheme} title="Cycle theme">
          🔄
        </button>
      </div>
    </div>
    
    <!-- Navbar Position -->
    <div class="setting-group">
      <label class="setting-label">Navbar Position</label>
      <div class="setting-controls">
        <div class="circular-nav">
          {#each navPositionOptions as opt (opt)}
            <button
              class="nav-option {navbarPosition === opt ? 'active' : ''}"
              on:click={() => navbarPosition = opt}
              aria-pressed={navbarPosition === opt}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          {/each}
        </div>
        <button class="icon-btn" on:click={toggleNavbarPosition} title="Cycle navbar position">
          📱
        </button>
      </div>
    </div>
    
    <!-- Dev Mode Toggle -->
    <div class="setting-group toggle-group">
      <label class="setting-label">Developer Mode</label>
      <div class="toggle-switch">
        <button class="toggle-button {devMode ? 'on' : 'off'}" on:click={toggleDevMode}></button>
      </div>
    </div>
    
    <!-- Sound Toggle -->
    <div class="setting-group toggle-group">
      <label class="setting-label">Sound Effects</label>
      <div class="toggle-switch">
        <button class="toggle-button {soundEnabled ? 'on' : 'off'}" on:click={toggleSound}></button>
      </div>
    </div>
    
    <!-- Notifications Toggle -->
    <div class="setting-group toggle-group">
      <label class="setting-label">Notifications</label>
      <div class="toggle-switch">
        <button class="toggle-button {notificationsEnabled ? 'on' : 'off'}" on:click={toggleNotifications}></button>
      </div>
    </div>
  </div>
  
  <div class="settings-footer">
    <button class="save-btn" on:click={() => isOpen = false}>Save & Close</button>
  </div>
</div>

<style>
  .settings-container {
    --bg-primary: var(--mcc-background);
    --bg-secondary: var(--mcc-surface);
    --primary: var(--mcc-primary);
    --accent: var(--mcc-accent);
    --text: var(--mcc-text);
    --text-muted: var(--mcc-text-muted);
    --border: var(--mcc-border);
    
    background: var(--bg-secondary);
    border-radius: 12px;
    padding: 20px;
    font-family: inherit;
    color: var(--text);
  }
  
  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  
  .settings-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--text-muted);
    line-height: 1;
    padding: 4px;
  }
  
  .setting-group {
    margin-bottom: 24px;
  }
  
  .setting-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--text-muted);
  }
  
  .setting-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .circular-nav {
    display: flex;
    background: var(--bg-primary);
    padding: 4px;
    border-radius: 8px;
  }
  
  .theme-option,
  .nav-option {
    flex: 1;
    padding: 8px 16px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.875rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .theme-option.active,
  .nav-option.active {
    background: var(--primary);
    color: white;
    font-weight: 500;
  }
  
  .theme-option:hover:not(.active),
  .nav-option:hover:not(.active) {
    background: var(--bg-primary);
  }
  
  .icon-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: var(--bg-primary);
    border-radius: 8px;
    cursor: pointer;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .icon-btn:hover {
    background: var(--primary);
    color: white;
  }
  
  .toggle-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .toggle-switch {
    position: relative;
    width: 52px;
    height: 28px;
  }
  
  .toggle-button {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: var(--bg-primary);
    border-radius: 28px;
    cursor: pointer;
    transition: transform 0.3s ease;
  }
  
  .toggle-button::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .toggle-button.on::after {
    transform: translateX(24px);
  }
  
  .settings-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }
  
  .save-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .save-btn:hover {
    background: var(--accent);
  }
</style>
