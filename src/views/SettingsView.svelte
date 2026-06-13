<script lang="ts">
  import { Toggle, Switch, Button, AlertDialog, Select, Accordion } from 'bits-ui';
  import { gameState } from '../stores/index.svelte';
  import { manualSave, resetProgress } from '../logic/save.svelte';
  import GameTooltip from '../components/GameTooltip.svelte';
  import type { NavPosition, Themes } from '../types';

  import appVersion from '../assets/version.txt?raw';
  import gitInfo from '../assets/git-info.txt?raw';
  const [commitHash, commitMessage] = gitInfo.trim().split('\n');

  let isResetDialogOpen = $state(false);

  interface SelectOption<T> {
    value: T;
    label: string;
    disabled?: boolean;
  }

  // Use 'satisfies' to ensure the values match your types perfectly
  const positionOptions = [
    { value: 'top', label: 'Top Navigation' },
    { value: 'bottom', label: 'Bottom Navigation', disabled: true },
    { value: 'left', label: 'Left Navigation', disabled: true },
    { value: 'right', label: 'Right Navigation', disabled: true },
    { value: 'hidden', label: 'Hide the Navtab', disabled: true },
  ] satisfies SelectOption<NavPosition>[];

  const themeOptions = [
    { value: 'dark', label: 'Dark Mode' },
    { value: 'light', label: 'Light Mode', disabled: true },
    { value: 'system', label: 'Auto (System Default)', disabled: true },
    { value: 'user', label: 'User Custom', disabled: true },
  ] satisfies SelectOption<Themes>[];

  const currentPositionLabel = $derived(positionOptions.find((o) => o.value === gameState.settings.navbarPosition)?.label ?? 'Select Position');

  const currentThemeLabel = $derived(themeOptions.find((o) => o.value === gameState.settings.theme)?.label ?? 'Select Theme');

  async function confirmAndReset() {
    await resetProgress();
    isResetDialogOpen = false;
  }
</script>

<div class="settings-container">
  <Accordion.Root type="single" class="accordion-root">
    <Accordion.Item value="interface" class="accordion-item">
      <Accordion.Header class="accordion-header">
        <Accordion.Trigger class="accordion-trigger">
          <span>Interface Settings</span>
          <span class="accordion-chevron">▼</span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content class="accordion-content">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Menu Position</span>
            <span class="setting-description">Choose where your primary application navigation tabs reside.</span>
          </div>
          <Select.Root type="single" bind:value={gameState.settings.navbarPosition}>
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
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Theme Engine</span>
            <span class="setting-description">Adjust visual skin profiles for optimal viewing configurations.</span>
          </div>
          <Select.Root type="single" bind:value={gameState.settings.theme}>
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
        </div>
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="system" class="accordion-item">
      <Accordion.Header class="accordion-header">
        <Accordion.Trigger class="accordion-trigger">
          <span>System Controls</span>
          <span class="accordion-chevron">▼</span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content class="accordion-content">
        <div class="setting-item flex-row">
          <div class="setting-info">
            <span class="setting-label">Default View</span>
            <span class="setting-description">Select whether to start at the World map or return to your previous tab.</span>
          </div>
          <Toggle.Root
            pressed={gameState.settings.defaultView === 'last-active'}
            onPressedChange={(pressed) => {
              gameState.settings.defaultView = pressed ? 'last-active' : 'world';
            }}
            class="toggle-root"
          >
            <span>{gameState.settings.defaultView === 'last-active' ? 'Last Active' : 'World'}</span>
          </Toggle.Root>
        </div>

        <div class="setting-item flex-row">
          <div class="setting-info">
            <span class="setting-label">Audio Effects</span>
            <span class="setting-description">Toggle ambient sounds, railway alerts, and mining audio output.</span>
          </div>
          <Switch.Root bind:checked={gameState.settings.soundEnabled} class="switch-root">
            <Switch.Thumb class="switch-thumb" />
          </Switch.Root>
        </div>

        <div class="setting-item flex-row">
          <div class="setting-info">
            <span class="setting-label">Push Notifications</span>
            <span class="setting-description">Allow system notifications when automation trains arrive at stations.</span>
          </div>
          <Switch.Root bind:checked={gameState.settings.notificationsEnabled} class="switch-root">
            <Switch.Thumb class="switch-thumb" />
          </Switch.Root>
        </div>

        <div class="setting-item flex-row">
          <div class="setting-info">
            <span class="setting-label">Developer Mode</span>
            <span class="setting-description">Unlocks Dev mode and raw seed modifications.</span>
          </div>
          <Toggle.Root class="toggle-root dev-mode" bind:pressed={gameState.settings.devMode}>
            <span>{gameState.settings.devMode ? 'Active' : 'Disabled'}</span>
          </Toggle.Root>
        </div>
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="save" class="accordion-item">
      <Accordion.Header class="accordion-header">
        <Accordion.Trigger class="accordion-trigger">
          <span>Save Management</span>
          <span class="accordion-chevron">▼</span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content class="accordion-content">
        <div class="setting-item flex-row">
          <div class="setting-info">
            <span class="setting-label">World Generation Seed</span>
            <span class="setting-description">The core procedural numerical signature mapped to your universe map.</span>
          </div>
          {#if gameState.settings.devMode}
            <input type="text" class="seed-input-field" bind:value={gameState.settings.worldSeed} placeholder="Enter world seed..." />
          {:else}
            <code class="seed-badge">{gameState.settings.worldSeed}</code>
          {/if}
        </div>

        <div class="action-grid">
          <Button.Root class="action-btn save-btn" onclick={manualSave}>💾 Save Progress Now</Button.Root>

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
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>

  <section class="settings-footer">
    <div class="telemetry-line">Mines & Choo-Choos — Alpha Architecture</div>
    <div class="telemetry-line">
      Version: v{appVersion.trim()} | Commit hash:
      <GameTooltip message={commitMessage || 'No data generated'} trigger={triggerTemplate} />
    </div>
  </section>

  {#snippet triggerTemplate()}
    <code>{commitHash || 'unknown'}</code>
  {/snippet}
</div>

<style>
  /* Accordion */
  :global(.accordion-root) {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  :global(.accordion-item) {
    width: 100%;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    overflow: hidden;
  }

  :global(.accordion-item:last-child) {
    border-bottom: none;
  }

  :global(.accordion-header) {
    width: 100%;
    margin: 0;
  }

  :global(.accordion-trigger) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    min-width: 0;
    padding: 20px;
    background: transparent;
    border: none;
    color: #38bdf8;
    font-size: 1.2rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  :global(.accordion-trigger:hover) {
    background: rgba(255, 255, 255, 0.03);
  }

  :global(.accordion-chevron) {
    font-size: 0.65rem;
    color: #94a3b8;
    transition: transform 0.2s ease;
  }

  :global(.accordion-trigger[data-state='open'] .accordion-chevron) {
    transform: rotate(180deg);
  }

  :global(.accordion-content) {
    width: 100%;
    padding: 0 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  :global(.accordion-content[data-state='closed']) {
    display: none;
  }

  :global(.tab-content > *) {
    display: flex;
    flex-direction: column;
    flex: 1; /* Fill available space */
    min-height: 0; /* CRITICAL: Allows the view to shrink if content is larger than the container */
  }
  /* Base Layout Architecture */
  .settings-container {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    color: #f3f4f6;
  }

  /* Setting Item Blocks */
  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .setting-item.flex-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .setting-label {
    font-weight: 500;
    font-size: 1rem;
  }

  :global(.select-item[data-disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
    background: transparent;
  }

  .setting-description {
    font-size: 0.85rem;
    color: #94a3b8;
    line-height: 1.4;
  }

  /* Dev Mode Seed Modification Field */
  .seed-input-field {
    background: #0f172a;
    border: 2px solid #f59e0b;
    color: #fbbf24;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    width: 90px;
    outline: none;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.1);
  }

  .seed-badge {
    background: #0f172a;
    padding: 6px 12px;
    border-radius: 6px;
    font-family: monospace;
    color: #e2e8f0;
    border: 1px solid #334155;
    font-size: 0.9rem;
  }

  /* Bits UI Dropdown Select Styling */
  :global(.select-trigger) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f172a;
    border: 1px solid #475569;
    color: #f3f4f6;
    padding: 10px 14px;
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    width: 100%;
    max-width: 280px;
    transition: border-color 0.15s ease;
  }

  :global(.select-trigger:hover) {
    border-color: #64748b;
  }

  .select-arrow {
    font-size: 0.65rem;
    color: #94a3b8;
    margin-left: 8px;
  }

  :global(.select-content) {
    background: #0f172a;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    min-width: 180px;
    z-index: 100;
  }

  :global(.select-item) {
    padding: 8px 12px;
    font-size: 0.875rem;
    color: #cbd5e1;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    outline: none;
  }

  :global(.select-item[data-highlighted]) {
    background: #0284c7;
    color: #fff;
  }

  :global(.select-item[data-selected]) {
    background: #2563eb;
    color: #fff;
    font-weight: 600;
  }

  /* Bits UI Switch Component Styling */
  :global(.switch-root) {
    width: 50px;
    height: 28px;
    background-color: #0f172a;
    border: 1px solid #475569;
    border-radius: 9999px;
    position: relative;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  :global(.switch-root[data-state='checked']) {
    background-color: #10b981;
    border-color: #34d399;
  }

  :global(.switch-thumb) {
    display: block;
    width: 20px;
    height: 20px;
    background-color: #fff;
    border-radius: 9999px;
    position: absolute;
    top: 3px;
    left: 4px;
    transition: transform 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  :global(.switch-root[data-state='checked'] .switch-thumb) {
    transform: translateX(20px);
  }

  /* Bits UI Toggle Component Styling */
  :global(.toggle-root) {
    background: #0f172a;
    border: 1px solid #475569;
    color: #94a3b8;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    min-width: 90px;
    text-align: center;
    transition: all 0.2s ease;
  }

  /* Add this specific override for the Dev Mode toggle */
  :global(.toggle-root.dev-mode[data-state='on']) {
    background: rgba(245, 158, 11, 0.15);
    border-color: #f59e0b;
    color: #fbbf24;
  }

  /* Action Buttons Grid */
  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (max-width: 480px) {
    .action-grid {
      grid-template-columns: 1fr;
    }
  }

  :global(.action-btn) {
    padding: 12px;
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    border: none;
    transition:
      transform 0.1s ease,
      filter 0.15s ease;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    color: #fff;
    width: 100%;
  }

  :global(.action-btn:active) {
    transform: scale(0.98);
  }

  :global(.save-btn) {
    background: #2563eb;
  }
  :global(.save-btn:hover) {
    filter: brightness(1.1);
  }
  :global(.reset-btn) {
    background: #dc2626;
  }
  :global(.reset-btn:hover) {
    filter: brightness(1.1);
  }

  /* Alert Dialog Modals */
  :global(.modal-overlay) {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
  }

  :global(.modal-content) {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 51;
    width: 90%;
    max-width: 460px;
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: #f3f4f6;
  }

  :global(.modal-title) {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #ef4444;
  }
  :global(.modal-description) {
    margin: 0;
    font-size: 0.95rem;
    color: #94a3b8;
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
    font-size: 0.9rem;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    border: none;
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

  /* Footer Specs */
  .settings-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
  }

  .telemetry-line {
    font-size: 0.75rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 4px;
  }
</style>
