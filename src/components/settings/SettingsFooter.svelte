<script lang="ts">
  /**
   * Compact build metadata footer for the settings view.
   *
   * Shows the app version and commit hash, while delegating commit message
   * display to the shared GameTooltip component.
   */
  import type { Snippet } from 'svelte';
  import GameTooltip from '../GameTooltip.svelte';

  interface Props {
    appVersion: string;
    commitHash: string;
    commitMessage: string;
    trigger: Snippet;
  }

  const { appVersion, commitMessage, trigger }: Props = $props();
</script>

<section class="settings-footer">
  <div class="telemetry-line">Mines & Choo-Choos — Alpha Architecture</div>

  <div class="telemetry-line">
    <span>Version: v{appVersion.trim()} | Commit hash:</span>
    <GameTooltip message={commitMessage || 'No data generated'} {trigger} />
  </div>
</section>

<style>
  /**
   * Settings footer metadata block.
   *
   * Kept local to the footer component so the parent settings view only owns
   * screen-level layout and interactive control styling.
   */
  .settings-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
  }

  .telemetry-line {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #64748b;
    font-size: 0.75rem;
  }
</style>
