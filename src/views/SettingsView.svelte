<!-- /src/views/SettingsView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Toggle, Switch, Button, AlertDialog, Select, Accordion } from 'bits-ui';
  import { log } from '../lib/logger';
  import { gameState } from '../logic/app/gameState.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import { plotsStore } from '../logic/mine/plotsStore.svelte';
  import { ensurePlotScaffold } from '../logic/mine/mineActions';

  import { debouncedSave, manualSave, resetProgress } from '../logic/save/save.svelte';
  import SettingsSection from '../components/settings/SettingsSection.svelte';
  import SettingsRow from '../components/settings/SettingsRow.svelte';
  import SettingsFooter from '../components/settings/SettingsFooter.svelte';

  import type { NavPosition } from '../logic/app/navigationTypes';
  import type { ThemeMode } from '../logic/app/settingsTypes';

  import { version as appVersion } from '../../package.json';
  import gitInfo from '../assets/git-info.txt?raw';

  const [commitHash, commitMessage] = gitInfo.trim().split('\n');

  let isResetDialogOpen = $state(false);

  interface SelectOption<T> {
    value: T;
    label: string;
    disabled?: boolean;
  }

  const positionOptions = [
    { value: 'top', label: 'Top Navigation', disabled: false },
    { value: 'bottom', label: 'Bottom Navigation', disabled: false },
    { value: 'left', label: 'Left Navigation', disabled: true },
    { value: 'right', label: 'Right Navigation', disabled: true },
    { value: 'hidden', label: 'Hide the Navtab', disabled: true },
  ] satisfies SelectOption<NavPosition>[];

  const themeOptions = [
    { value: 'dark', label: 'Dark Mode', disabled: false },
    { value: 'light', label: 'Light Mode', disabled: false },
    { value: 'system', label: 'Auto (System Default)', disabled: false },
    { value: 'user', label: 'User Custom', disabled: false },
  ] satisfies SelectOption<ThemeMode>[];

  const currentPositionLabel = $derived(positionOptions.find((o) => o.value === gameState.current.settings.navbarPosition)?.label ?? 'Select Position');
  const currentThemeLabel = $derived(themeOptions.find((o) => o.value === gameState.current.settings.theme)?.label ?? 'Select Theme');

  onMount(() => {
    log.debug(
      'settings',
      `mount navbar=${gameState.current.settings.navbarPosition} view=${gameState.current.settings.defaultView} sound=${gameState.current.settings.soundEnabled} notifications=${gameState.current.settings.notificationsEnabled} dev=${gameState.current.settings.devMode} theme=${gameState.current.settings.theme}`,
    );
  });

  async function confirmAndReset() {
    log.debug('settings', 'reset requested');
    await resetProgress();
    isResetDialogOpen = false;
    log.debug('settings', 'reset dialog closed');
  }

  function saveSettingsChange(topic: string, details: string) {
    log.debug('settings', `${topic}=${details}`);
    debouncedSave();
  }

  function cheatAddMoney() {
    gameState.addMoney(1000);
    log.debug('cheat', 'added 1000 money');
    debouncedSave();
  }

  function cheatRevealWorld() {
    worldStore.current.cells.forEach((cell) => worldStore.discoverCell(cell.id));
    log.debug('cheat', 'revealed all world cells');
    debouncedSave();
  }

  function cheatBuildActivePlot() {
    const cellId = worldStore.current.activePlotCellId;
    if (!cellId) {
      log.debug('cheat', 'no active plot to build');
      return;
    }
    const alreadyScaffolded = plotsStore.has(cellId);
    ensurePlotScaffold(cellId);
    log.debug('cheat', alreadyScaffolded ? `active plot ${cellId} already scaffolded` : `scaffolded active plot ${cellId}`);
    debouncedSave();
  }

  function cheatDiscoverNeighborPlot() {
    const cell = worldStore.current.cells.find((c) => c.type === 'plot' && !c.discovered);
    if (!cell) {
      log.debug('cheat', 'no undiscovered plot cells left');
      return;
    }
    worldStore.discoverCell(cell.id);
    ensurePlotScaffold(cell.id);
    log.debug('cheat', `discovered + scaffolded neighbor plot ${cell.id}`);
    debouncedSave();
  }
</script>

<div class="settings-container">
  <div class="settings-scroll">
    <Accordion.Root type="single" class="accordion-root">
      <SettingsSection value="interface" title="Interface Settings">
        <SettingsRow label="Menu Position" description="Choose where your primary application navigation tabs reside.">
          <Select.Root
            type="single"
            bind:value={gameState.current.settings.navbarPosition}
            onValueChange={(value) => {
              gameState.setNavbarPosition(value as NavPosition);
              saveSettingsChange('navbarPosition', value);
            }}
          >
            <Select.Trigger class="select-trigger">
              <span>{currentPositionLabel}</span>
              <span class="select-arrow">▼</span>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content class="select-content">
                {#each positionOptions as opt (opt.value)}
                  <Select.Item class="select-item" value={opt.value} label={opt.label} disabled={opt.disabled ?? false}>
                    {opt.label}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsRow>

        <SettingsRow label="Theme Engine" description="Adjust visual skin profiles for optimal viewing configurations.">
          <Select.Root
            type="single"
            bind:value={gameState.current.settings.theme}
            onValueChange={(value) => {
              gameState.setTheme(value as ThemeMode);
              saveSettingsChange('theme', value);
            }}
          >
            <Select.Trigger class="select-trigger">
              <span>{currentThemeLabel}</span>
              <span class="select-arrow">▼</span>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content class="select-content">
                {#each themeOptions as opt (opt.value)}
                  <Select.Item class="select-item" value={opt.value} label={opt.label} disabled={opt.disabled ?? false}>
                    {opt.label}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsRow>

        {#if gameState.current.settings.theme === 'user'}
          <SettingsRow label="Theme Colour" description="Pick the base colour the entire neutral palette derives from." inline={true}>
            <input
              type="color"
              class="color-input-field"
              value={gameState.current.settings.userColor}
              oninput={(e) => {
                const value = (e.currentTarget as HTMLInputElement).value;
                gameState.setUserColor(value);
                saveSettingsChange('userColor', value);
              }}
            />
          </SettingsRow>
        {/if}
      </SettingsSection>

      <SettingsSection value="system" title="System Controls">
        <SettingsRow label="Default View" description="Select whether to start at the World map or return to your previous tab." inline={true}>
          <Toggle.Root
            pressed={gameState.current.settings.defaultView === 'last-active'}
            onPressedChange={(pressed) => {
              const next = pressed ? 'last-active' : 'world';
              gameState.setDefaultView(next);
              saveSettingsChange('defaultView', next);
            }}
            class="toggle-root"
          >
            <span>{gameState.current.settings.defaultView === 'last-active' ? 'Last Active' : 'World'}</span>
          </Toggle.Root>
        </SettingsRow>

        <SettingsRow label="Audio Effects" description="Toggle ambient sounds, railway alerts, and mining audio output." inline={true}>
          <Switch.Root
            bind:checked={gameState.current.settings.soundEnabled}
            onCheckedChange={(checked) => {
              gameState.setSoundEnabled(checked);
              saveSettingsChange('soundEnabled', String(checked));
            }}
            class="switch-root"
          >
            <Switch.Thumb class="switch-thumb" />
          </Switch.Root>
        </SettingsRow>

        <SettingsRow label="Push Notifications" description="Allow system notifications when automation trains arrive at stations." inline={true}>
          <Switch.Root
            bind:checked={gameState.current.settings.notificationsEnabled}
            onCheckedChange={(checked) => {
              gameState.setNotificationsEnabled(checked);
              saveSettingsChange('notificationsEnabled', String(checked));
            }}
            class="switch-root"
          >
            <Switch.Thumb class="switch-thumb" />
          </Switch.Root>
        </SettingsRow>

        <SettingsRow label="Developer Mode" description="Unlocks Dev mode and raw seed modifications." inline={true}>
          <Toggle.Root
            class="toggle-root dev-mode"
            pressed={gameState.current.settings.devMode}
            onPressedChange={(pressed) => {
              gameState.setDevMode(pressed);
              saveSettingsChange('devMode', String(pressed));
            }}
          >
            <span>{gameState.current.settings.devMode ? 'Active' : 'Disabled'}</span>
          </Toggle.Root>
        </SettingsRow>
      </SettingsSection>

      {#if gameState.current.settings.devMode}
        <SettingsSection value="cheats" title="Developer Cheats">
          <div class="action-grid">
            <Button.Root class="glass-btn" onclick={cheatAddMoney}>💰 Add $1,000</Button.Root>
            <Button.Root class="glass-btn" onclick={cheatRevealWorld}>🗺️ Reveal All Cells</Button.Root>
            <Button.Root class="glass-btn" onclick={cheatBuildActivePlot}>🏗️ Build Active Plot</Button.Root>
            <Button.Root class="glass-btn" onclick={cheatDiscoverNeighborPlot}>📍 Discover Neighbor Plot</Button.Root>
          </div>
        </SettingsSection>
      {/if}

      <SettingsSection value="save" title="Save Management">
        <SettingsRow label="World Generation Seed" description="The core procedural numerical signature mapped to your universe map." inline={true}>
          {#if gameState.current.settings.devMode}
            <input
              type="text"
              class="seed-input-field"
              value={gameState.current.settings.worldSeed}
              oninput={(e) => {
                const value = (e.currentTarget as HTMLInputElement).value;
                gameState.setWorldSeed(value);
                log.debug('settings', `worldSeed=${value}`);
                debouncedSave();
              }}
              placeholder="Enter world seed..."
            />
          {:else}
            <code class="seed-badge">{gameState.current.settings.worldSeed}</code>
          {/if}
        </SettingsRow>

        <div class="action-grid">
          <Button.Root
            class="action-btn save-btn"
            onclick={() => {
              log.debug('settings', 'manual save clicked');
              manualSave();
            }}
          >
            💾 Save Progress Now
          </Button.Root>

          <AlertDialog.Root bind:open={isResetDialogOpen}>
            <AlertDialog.Trigger class="action-btn reset-btn">⚠️ Wipe & Reset Game Data</AlertDialog.Trigger>

            <AlertDialog.Portal>
              <AlertDialog.Overlay class="modal-overlay" />
              <AlertDialog.Content class="modal-content">
                <AlertDialog.Title class="modal-title">Confirm Imperial Wipedown</AlertDialog.Title>

                <AlertDialog.Description class="modal-description">
                  Are you absolutely sure you want to reset your railway empire? This process removes all accumulated money, physical tracks, and mining
                  milestones permanently.
                </AlertDialog.Description>

                <div class="modal-actions">
                  <AlertDialog.Cancel class="modal-btn cancel-btn">Abort Changes</AlertDialog.Cancel>
                  <AlertDialog.Action class="modal-btn confirm-btn" onclick={confirmAndReset}>Nuke Progress Data</AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </SettingsSection>
    </Accordion.Root>
  </div>

  <SettingsFooter {appVersion} {commitHash} {commitMessage} trigger={triggerTemplate} />

  {#snippet triggerTemplate()}
    <code>{commitHash || 'unknown'}</code>
  {/snippet}
</div>

<style>
  /**
   * Settings view shell.
   *
   * The container fills available height, the middle section becomes the
   * real scroll area, and the footer stays visible at the bottom.
   */
  .settings-container {
    width: 100%;
    height: 100%;
    min-height: 0;
    max-width: none;
    margin: 0;
    padding: 24px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    color: #f3f4f6;
  }

  /**
   * Internal scroll region for accordion content.
   *
   * min-height: 0 is the key flexbox fix that allows this area to shrink
   * and scroll instead of pushing the whole view taller than the viewport.
   */
  .settings-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
  }

  :global(.accordion-root) {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /**
   * Shared seed display controls.
   */
  .seed-input-field {
    width: 90px;
    padding: 8px 12px;
    border: 2px solid #f59e0b;
    border-radius: 6px;
    outline: none;
    background: #0f172a;
    color: #fbbf24;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.1);
    font-family: monospace;
    font-size: 0.9rem;
  }

  .color-input-field {
    width: 48px;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--mcc-border);
    border-radius: 8px;
    background: var(--mcc-surface-2);
    cursor: pointer;
  }

  .seed-badge {
    padding: 6px 12px;
    border: 1px solid #334155;
    border-radius: 6px;
    background: #0f172a;
    color: #e2e8f0;
    font-family: monospace;
    font-size: 0.9rem;
  }

  /**
   * Bits UI select styling.
   */
  :global(.select-trigger) {
    width: 100%;
    max-width: 280px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 14px;
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    background-color: var(--mcc-surface-2);
    background-image: var(--mcc-btn-sheen);
    color: var(--mcc-text-main);
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
    cursor: pointer;
    transition: filter 0.15s ease;
  }

  :global(.select-trigger:hover) {
    filter: brightness(1.1);
  }

  .select-arrow {
    margin-left: 8px;
    color: var(--mcc-text-muted);
    font-size: 0.65rem;
  }

  :global(.select-content) {
    z-index: 100;
    min-width: 180px;
    padding: 4px;
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    background: var(--mcc-panel-solid);
    backdrop-filter: blur(12px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
  }

  :global(.select-item) {
    padding: 8px 12px;
    border-radius: 8px;
    color: var(--mcc-text-main);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
    outline: none;
  }

  :global(.select-item[data-highlighted]) {
    background: var(--mcc-surface-2);
    color: var(--mcc-text-main);
  }

  :global(.select-item[data-selected]) {
    color: var(--mcc-gold);
    font-weight: 700;
  }

  :global(.select-item[data-disabled]) {
    opacity: 0.4;
    cursor: not-allowed;
    background: transparent;
  }

  /**
   * Bits UI switch styling.
   */
  :global(.switch-root) {
    position: relative;
    width: 50px;
    height: 28px;
    border: 1px solid var(--mcc-border);
    border-radius: 9999px;
    background-color: var(--mcc-surface-2);
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  :global(.switch-root[data-state='checked']) {
    background-color: var(--mcc-status-hard);
    border-color: color-mix(in srgb, var(--mcc-status-hard) 70%, white 30%);
  }

  :global(.switch-thumb) {
    position: absolute;
    top: 3px;
    left: 4px;
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 9999px;
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s;
  }

  :global(.switch-root[data-state='checked'] .switch-thumb) {
    transform: translateX(20px);
  }

  /**
   * Bits UI toggle styling.
   */
  :global(.toggle-root) {
    min-width: 90px;
    padding: 8px 16px;
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    background-color: var(--mcc-surface-2);
    background-image: var(--mcc-btn-sheen);
    color: var(--mcc-text-muted);
    font-size: 0.875rem;
    font-weight: 700;
    text-align: center;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease,
      background-color 0.15s ease;
  }

  :global(.toggle-root[data-state='on']) {
    color: var(--mcc-gold);
    border-color: color-mix(in srgb, var(--mcc-gold) 40%, transparent);
    background-color: color-mix(in srgb, var(--mcc-gold) 10%, var(--mcc-surface-2));
  }

  /**
   * Save management action layout.
   */
  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  :global(.action-btn) {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 13px 16px;
    border: none;
    border-radius: 14px;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 0.1s ease,
      box-shadow 0.1s ease,
      filter 0.15s ease;
  }

  :global(.save-btn) {
    color: #06301c;
    background-image:
      linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.06) 46%, rgba(255, 255, 255, 0)),
      linear-gradient(180deg, var(--mcc-green-top), var(--mcc-green-bot));
    box-shadow:
      0 4px 0 var(--mcc-green-edge),
      0 7px 12px rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  :global(.save-btn:hover) {
    filter: brightness(1.05);
  }

  :global(.save-btn:active) {
    transform: translateY(3px);
    box-shadow:
      0 1px 0 var(--mcc-green-edge),
      0 2px 6px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  :global(.reset-btn) {
    color: #fff;
    background-image:
      linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.04) 46%, rgba(255, 255, 255, 0)),
      linear-gradient(180deg, var(--mcc-red-top), var(--mcc-red-bot));
    box-shadow:
      0 4px 0 var(--mcc-red-edge),
      0 7px 12px rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  }

  :global(.reset-btn:hover) {
    filter: brightness(1.05);
  }

  :global(.reset-btn:active) {
    transform: translateY(3px);
    box-shadow:
      0 1px 0 var(--mcc-red-edge),
      0 2px 6px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  /**
   * Alert dialog styling.
   */
  :global(.modal-overlay) {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
  }

  :global(.modal-content) {
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: 51;
    width: 90%;
    max-width: 460px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    transform: translate(-50%, -50%);
    border: 1px solid var(--mcc-border);
    border-radius: 14px;
    background: var(--mcc-panel-solid);
    backdrop-filter: blur(16px);
    color: var(--mcc-text-main);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  }

  :global(.modal-title) {
    margin: 0;
    color: #ef4444;
    font-size: 1.25rem;
    font-weight: 600;
  }

  :global(.modal-description) {
    margin: 0;
    color: #94a3b8;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
  }

  :global(.modal-btn) {
    padding: 10px 18px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }

  :global(.cancel-btn) {
    background: #334155;
    color: #cbd5e1;
  }

  :global(.cancel-btn:hover) {
    background: #475569;
    color: #fff;
  }

  :global(.confirm-btn) {
    background: #dc2626;
    color: #fff;
  }

  :global(.confirm-btn:hover) {
    background: #b91c1c;
  }

  @media (max-width: 640px) {
    .settings-container {
      padding: 16px 12px 12px;
    }

    .action-grid {
      grid-template-columns: 1fr;
    }

    :global(.select-trigger) {
      max-width: none;
    }

    .modal-actions {
      flex-direction: column;
    }

    :global(.modal-btn) {
      width: 100%;
    }
  }
</style>
