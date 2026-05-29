<script lang="ts">
  import { gameState } from "$stores/index";
  import { log } from "$lib/logger";

  // Version and git info (embedded at build time)
  const VERSION = "0.0.1";
  const COMMIT_HASH = "d0bd966";
  const COMMIT_MESSAGE = "License and readme update";

  let navbarPosition = $gameState.settings.navbarPosition;
  let devMode = $gameState.settings.devMode;
  let soundEnabled = $gameState.settings.soundEnabled;
  let notificationsEnabled = $gameState.settings.notificationsEnabled;
  let theme = $gameState.settings.theme;

  function handleNavbarPositionChange(position: "top" | "bottom") {
    $gameState.settings.navbarPosition = position;
    log.debug("settings", `Navbar position changed to: ${position}`);
    debouncedSave();
  }

  function handleDevModeChange(enabled: boolean) {
    $gameState.settings.devMode = enabled;
    log.debug("settings", `Dev mode changed to: ${enabled ? "on" : "off"}`);
    debouncedSave();
  }

  function handleSoundToggle(enabled: boolean) {
    $gameState.settings.soundEnabled = enabled;
    log.debug("settings", `Sound enabled: ${enabled}`);
    debouncedSave();
  }

  function handleNotificationsToggle(enabled: boolean) {
    $gameState.settings.notificationsEnabled = enabled;
    log.debug("settings", `Notifications enabled: ${enabled}`);
    debouncedSave();
  }

  function handleThemeChange(theme: "light" | "dark") {
    $gameState.settings.theme = theme;
    log.debug("settings", `Theme changed to: ${theme}`);
    debouncedSave();
  }

  // World seed - read-only or editable based on dev mode
  let worldSeed = $derived(devMode ? "" : $gameState.settings.worldSeed || "");

  function handleWorldSeedChange(seed: string) {
    if (devMode) {
      $gameState.settings.worldSeed = seed;
      log.debug("settings", `World seed changed to: ${seed}`);
      debouncedSave();
    }
  }

  async function handleResetProgress(): Promise<void> {
    // Show confirmation dialog
    const confirmed = confirm(
      "⚠️ RESET ALL PROGRESS ⚠️\n\n" +
        "This will permanently delete:\n" +
        "- All mined resources\n" +
        "- All progress and achievements\n" +
        "- All settings\n\n" +
        'Type "RESET" to confirm:',
    );

    if (confirmed !== "RESET") {
      log.info("settings", "Reset progress cancelled by user");
      return;
    }

    try {
      await resetProgress();
    } catch (error) {
      log.error("save", `Reset failed: ${String(error)}`);
      alert("Failed to reset progress. Please refresh the page.");
    }
  }

  function debouncedSave(): void {
    // Clear existing timeout
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }

    // Set new timeout
    saveTimeoutId = setTimeout(() => {
      try {
        const settings = $gameState.settings;
        localStorage.setItem("mcc_settings", JSON.stringify(settings));
        log.info("save", "Settings saved to localStorage (debounced)");
      } catch (error) {
        log.error("save", `Failed to save settings: ${String(error)}`);
      }
    }, 500); // 500ms debounce
  }

  let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Show toast on commit hash click
  function showCommitToast() {
    const toast = document.createElement("div");
    toast.className = "commit-toast";
    toast.textContent = COMMIT_MESSAGE;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      padding: 16px 24px;
      border-radius: 16px;
      font-size: var(--md-sys-typescale-body-medium);
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(-50%) translateY(0)";
      toast.style.opacity = "1";
    });

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(100px)";
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
</script>

<main class="content-section">
  <!-- Settings List -->
  <div class="settings-list">
    <!-- GENERAL Section -->
    <section class="settings-section" id="general">
      <h2 class="section-header">GENERAL</h2>

      <!-- Theme Setting -->
      <div class="setting-row">
        <div class="setting-left">
          <span class="setting-icon">🎨</span>
          <span class="setting-label">Theme</span>
        </div>
        <button
          class="setting-button toggle-button"
          onclick={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
          aria-label={`Toggle theme to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <span class="button-icon">🌙</span>
          <span class="button-text">Dark Mode</span>
        </button>
      </div>

      <!-- Reset Save Data Setting -->
      <div class="setting-row">
        <div class="setting-left">
          <span class="setting-icon">🗑️</span>
          <span class="setting-label">Reset Save Data</span>
        </div>
        <button
          class="setting-button danger-button"
          onclick={handleResetProgress}
          aria-label="Reset all save data"
        >
          <span class="button-icon">🗑️</span>
          <span class="button-text">Reset All Data</span>
        </button>
      </div>

      <!-- Navigation Bar Position Setting -->
      <div class="setting-row">
        <div class="setting-left">
          <span class="setting-icon">📍</span>
          <span class="setting-label">Navigation Bar Position</span>
        </div>
        <button
          class="setting-button toggle-button"
          onclick={() =>
            handleNavbarPositionChange(
              navbarPosition === "top" ? "bottom" : "top",
            )}
          aria-label={`Move navigation bar to ${navbarPosition === "top" ? "bottom" : "top"}`}
        >
          <span class="button-icon">⬇️</span>
          <span class="button-text">Move Nav Down</span>
        </button>
      </div>

      <!-- Version Information Setting -->
      <div class="setting-row">
        <div class="setting-left">
          <span class="setting-icon">📦</span>
          <span class="setting-label">Version Information</span>
        </div>
        <div class="setting-right-info">
          <span class="info-box">{VERSION}</span>
          <button
            class="info-box commit-hash"
            onclick={() => showCommitToast()}
            aria-label={`View commit ${COMMIT_HASH} — ${COMMIT_MESSAGE}`}
            title={COMMIT_MESSAGE}
          >
            {COMMIT_HASH.substring(0, 7)}
          </button>
        </div>
      </div>
    </section>

    <!-- DEVELOPER Section -->
    <section class="settings-section" id="developer">
      <h2 class="section-header">DEVELOPER</h2>

      <!-- Dev Mode Setting -->
      <div class="setting-row">
        <div class="setting-left">
          <span class="setting-icon">🔧</span>
          <span class="setting-label">Dev Mode</span>
        </div>
        <button
          class="setting-button toggle-button"
          onclick={() => handleDevModeChange(!devMode)}
          aria-label={`Toggle developer mode to ${!devMode ? "on" : "off"}`}
        >
          <span class="button-icon">{devMode ? "⚙️" : "🔧"}</span>
          <span class="button-text">{devMode ? "ON" : "OFF"}</span>
        </button>
      </div>

      <!-- World Seed Setting -->
      <div class="setting-row">
        <div class="setting-left">
          <span class="setting-icon">🌱</span>
          <span class="setting-label">World Seed</span>
        </div>
        <input
          type="text"
          class="setting-input"
          value={worldSeed}
          disabled={!devMode}
          onchange={(e) => handleWorldSeedChange(e.target.value)}
          placeholder="Enter world seed"
        />
      </div>
    </section>

    <!-- ABOUT Section -->
    <section class="settings-section" id="about">
      <h2 class="section-header">ABOUT</h2>

      <!-- Description Setting -->
      <div class="setting-row description-row">
        <div class="setting-left">
          <span class="setting-icon">📄</span>
          <span class="setting-label">Description</span>
        </div>
        <div class="setting-description">
          Mines & Choo-Choo is a mobile-first idle railway tycoon game. Build
          your empire from rubble to rail dominance!
        </div>
      </div>
    </section>
  </div>
</main>

<style lang="css">
  /* Base Layout */
  .content-section {
    padding: var(--md-sys-spacing-md);
    background-color: #121212;
    min-height: 100vh;
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* App Header */
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--md-sys-spacing-lg) 0;
    margin-bottom: var(--md-sys-spacing-md);
  }

  .app-header h1 {
    font-size: var(--md-sys-typescale-headline-medium);
    color: var(--md-sys-color-on-background);
    margin: 0;
    font-weight: 500;
    letter-spacing: -0.02em;
  }

  .currency-display {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #1e1e1e;
    padding: 8px 16px;
    border-radius: var(--md-sys-shape-corner-full);
  }

  .currency-icon {
    font-size: 20px;
  }

  .currency-value {
    font-size: var(--md-sys-typescale-body-large);
    color: #ffd700;
    font-weight: 600;
  }

  /* Settings List */
  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Settings Section */
  .settings-section {
    border-top: 1px solid #2c2c2c;
  }

  .settings-section:first-of-type {
    border-top: none;
  }

  /* Section Header */
  .section-header {
    font-size: var(--md-sys-typescale-label-large);
    color: #9c4dcc;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
    margin: 0;
    font-weight: 600;
  }

  /* Setting Row */
  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
  }

  .setting-row:last-child {
    border-bottom: none;
  }

  /* Setting Left Side */
  .setting-left {
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-sm);
  }

  .setting-icon {
    font-size: 24px;
    line-height: 1;
  }

  .setting-label {
    font-size: var(--md-sys-typescale-body-medium);
    color: var(--md-sys-color-on-background);
    font-weight: 500;
  }

  /* Setting Right Side (Info Boxes) */
  .setting-right-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-box {
    background-color: #2c2c2c;
    color: var(--md-sys-color-on-surface-variant);
    padding: 6px 12px;
    border-radius: var(--md-sys-shape-corner-full);
    font-size: var(--md-sys-typescale-body-small);
    min-width: 80px;
    text-align: center;
  }

  .commit-hash {
    font-family: "Monaco", "Consolas", monospace;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .commit-hash:hover {
    background-color: #3d3d3d;
  }

  /* Setting Buttons */
  .setting-button {
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-sm);
    padding: 10px 16px;
    border: none;
    border-radius: var(--md-sys-shape-corner-full);
    font-size: var(--md-sys-typescale-body-medium);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 140px;
    justify-content: center;
  }

  .setting-button .button-icon {
    font-size: 18px;
    line-height: 1;
  }

  /* Toggle Button (Blue/Purple) */
  .toggle-button {
    background: linear-gradient(135deg, #6750a4, #7c5dff);
    color: white;
  }

  .toggle-button:hover {
    background: linear-gradient(135deg, #5b4292, #6a4de8);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(124, 93, 255, 0.3);
  }

  /* Danger Button (Red) */
  .danger-button {
    background-color: #d32f2f;
    color: white;
  }

  .danger-button:hover {
    background-color: #b71c1c;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(211, 47, 47, 0.3);
  }

  /* Input Field */
  .setting-input {
    background-color: #2c2c2c;
    border: 1px solid #3d3d3d;
    color: var(--md-sys-color-on-background);
    padding: 10px 14px;
    border-radius: var(--md-sys-shape-corner-full);
    font-size: var(--md-sys-typescale-body-medium);
    min-width: 180px;
    transition: all 0.2s ease;
  }

  .setting-input:focus {
    outline: none;
    border-color: #7c5dff;
    box-shadow: 0 0 0 2px rgba(124, 93, 255, 0.3);
  }

  .setting-input:disabled {
    background-color: #1e1e1e;
    color: #888;
    cursor: not-allowed;
  }

  /* Description Row */
  .description-row {
    padding: var(--md-sys-spacing-lg) var(--md-sys-spacing-lg);
  }

  .setting-description {
    font-size: var(--md-sys-typescale-body-small);
    color: var(--md-sys-color-on-surface-variant);
    line-height: 1.5;
    max-width: 80%;
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

  /* Commit Toast */
  .commit-toast {
    animation:
      toastIn 0.3s ease-out,
      toastOut 0.3s ease-in;
  }

  @keyframes toastIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(100px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes toastOut {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(100px);
    }
  }

  /* Mobile adjustments */
  @media (max-width: 767px) {
    .content-section {
      padding: var(--md-sys-spacing-sm);
    }

    .app-header {
      padding: var(--md-sys-spacing-md) 0;
    }

    .setting-row {
      padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
    }

    .section-header {
      padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
    }
  }
</style>
