<script lang="ts">
  /**
   * Settings screen controller.
   *
   * Hosts all editable settings state, save/reset actions, and build metadata,
   * while delegating repeated accordion and row markup to child components.
   */
  import { Toggle, Switch, Button, AlertDialog, Select, Accordion } from 'bits-ui';
  import { gameState } from '../stores/index.svelte';
  import { manualSave, resetProgress } from '../logic/save.svelte';
  import SettingsSection from '../components/settings/SettingsSection.svelte';
  import SettingsRow from '../components/settings/SettingsRow.svelte';
  import SettingsFooter from '../components/settings/SettingsFooter.svelte';
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

  /**
   * Navbar position options.
   */
  const positionOptions = [
    { value: 'top', label: 'Top Navigation', disabled: false },
    { value: 'bottom', label: 'Bottom Navigation', disabled: false },
    { value: 'left', label: 'Left Navigation', disabled: true },
    { value: 'right', label: 'Right Navigation', disabled: true },
    { value: 'hidden', label: 'Hide the Navtab', disabled: true },
  ] satisfies SelectOption<NavPosition>[];

  /**
   * Theme engine options.
   */
  const themeOptions = [
    { value: 'dark', label: 'Dark Mode' },
    { value: 'light', label: 'Light Mode', disabled: true },
    { value: 'system', label: 'Auto (System Default)', disabled: true },
    { value: 'user', label: 'User Custom', disabled: true },
  ] satisfies SelectOption<Themes>[];

  /**
   * Human-readable current navbar position label.
   */
  const currentPositionLabel = $derived(positionOptions.find((o) => o.value === gameState.settings.navbarPosition)?.label ?? 'Select Position');

  /**
   * Human-readable current theme label.
   */
  const currentThemeLabel = $derived(themeOptions.find((o) => o.value === gameState.settings.theme)?.label ?? 'Select Theme');

  /**
   * Resets all progress after destructive-action confirmation.
   */
  async function confirmAndReset() {
    await resetProgress();
    isResetDialogOpen = false;
  }
</script>

<div class="settings-container">
  <div class="settings-scroll">
    <Accordion.Root type="single" class="accordion-root">
      <SettingsSection value="interface" title="Interface Settings">
        <SettingsRow label="Menu Position" description="Choose where your primary application navigation tabs reside.">
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
        </SettingsRow>

        <SettingsRow label="Theme Engine" description="Adjust visual skin profiles for optimal viewing configurations.">
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
        </SettingsRow>
      </SettingsSection>

      <SettingsSection value="system" title="System Controls">
        <SettingsRow label="Default View" description="Select whether to start at the World map or return to your previous tab." inline={true}>
          <Toggle.Root
            pressed={gameState.settings.defaultView === 'last-active'}
            onPressedChange={(pressed) => {
              gameState.settings.defaultView = pressed ? 'last-active' : 'world';
            }}
            class="toggle-root"
          >
            <span>{gameState.settings.defaultView === 'last-active' ? 'Last Active' : 'World'}</span>
          </Toggle.Root>
        </SettingsRow>

        <SettingsRow label="Audio Effects" description="Toggle ambient sounds, railway alerts, and mining audio output." inline={true}>
          <Switch.Root bind:checked={gameState.settings.soundEnabled} class="switch-root">
            <Switch.Thumb class="switch-thumb" />
          </Switch.Root>
        </SettingsRow>

        <SettingsRow label="Push Notifications" description="Allow system notifications when automation trains arrive at stations." inline={true}>
          <Switch.Root bind:checked={gameState.settings.notificationsEnabled} class="switch-root">
            <Switch.Thumb class="switch-thumb" />
          </Switch.Root>
        </SettingsRow>

        <SettingsRow label="Developer Mode" description="Unlocks Dev mode and raw seed modifications." inline={true}>
          <Toggle.Root class="toggle-root dev-mode" bind:pressed={gameState.settings.devMode}>
            <span>{gameState.settings.devMode ? 'Active' : 'Disabled'}</span>
          </Toggle.Root>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection value="save" title="Save Management">
        <SettingsRow label="World Generation Seed" description="The core procedural numerical signature mapped to your universe map." inline={true}>
          {#if gameState.settings.devMode}
            <input type="text" class="seed-input-field" bind:value={gameState.settings.worldSeed} placeholder="Enter world seed..." />
          {:else}
            <code class="seed-badge">{gameState.settings.worldSeed}</code>
          {/if}
        </SettingsRow>

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
    padding: 10px 14px;
    border: 1px solid #475569;
    border-radius: 6px;
    background: #0f172a;
    color: #f3f4f6;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  :global(.select-trigger:hover) {
    border-color: #64748b;
  }

  .select-arrow {
    margin-left: 8px;
    color: #94a3b8;
    font-size: 0.65rem;
  }

  :global(.select-content) {
    z-index: 100;
    min-width: 180px;
    padding: 4px;
    border: 1px solid #475569;
    border-radius: 6px;
    background: #0f172a;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  }

  :global(.select-item) {
    padding: 8px 12px;
    border-radius: 4px;
    color: #cbd5e1;
    font-size: 0.875rem;
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

  :global(.select-item[data-disabled]) {
    opacity: 0.5;
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
    border: 1px solid #475569;
    border-radius: 9999px;
    background-color: #0f172a;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  :global(.switch-root[data-state='checked']) {
    background-color: #10b981;
    border-color: #34d399;
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
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
    border: 1px solid #475569;
    border-radius: 6px;
    background: #0f172a;
    color: #94a3b8;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  :global(.toggle-root.dev-mode[data-state='on']) {
    background: rgba(245, 158, 11, 0.15);
    border-color: #f59e0b;
    color: #fbbf24;
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
    padding: 12px;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.1s ease,
      filter 0.15s ease;
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
    border: 1px solid #475569;
    border-radius: 12px;
    background: #1e293b;
    color: #f3f4f6;
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
