<script lang="ts">
  import { Button } from 'bits-ui';
  import type { ClearStatus } from '../logic/mineGen';
  //   import MyMeter from './MyMeter.svelte';

  const {
    plotLabel,
    expansionLabel,
    depth,
    clearStatus,
    clearPercent,
    canGoSouth = false,
    canDigDeeper = false,
    onNorthAction,
    onSouthAction,
    onDigDeeper,
  }: {
    plotLabel: string;
    expansionLabel: string;
    depth: number;
    clearStatus: ClearStatus;
    clearPercent: number;
    canGoSouth?: boolean;
    canDigDeeper?: boolean;
    onNorthAction: () => void;
    onSouthAction: () => void;
    onDigDeeper: () => void;
  } = $props();

  import MyMeter from './MyMeter.svelte';
</script>

<header class="header">
  <div class="stats">
    <span>
      Plot: {plotLabel} | Expansion: {expansionLabel} | Depth: {depth}
    </span>
    <span>Clear status: {clearStatus}</span>
  </div>

  <MyMeter value={clearPercent} max={100} status={clearStatus} />

  <div class="nav-grid">
    <Button.Root class="nav-btn" onclick={onNorthAction}>
      {depth !== 0 ? 'Top' : '← North'}
    </Button.Root>

    <Button.Root class="nav-btn" onclick={onSouthAction} disabled={!canGoSouth}>South →</Button.Root>

    <Button.Root class="nav-btn" disabled>Up</Button.Root>

    <Button.Root class="nav-btn" onclick={onDigDeeper} disabled={!canDigDeeper}>Down / Dig</Button.Root>
  </div>
</header>

<style>
  .header {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: calc(var(--mine-padding) / 3) var(--mine-padding);
  }

  .stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--mcc-text-main);
  }

  .nav-grid {
    display: grid;
    grid-template-columns: repeat(var(--mine-nav-columns), minmax(0, 1fr));
    gap: var(--spacing-sm);
  }

  :global(.nav-btn) {
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--mcc-border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--mcc-bg-surface) 70%, white 8%);
    color: var(--mcc-text-main);
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease,
      opacity 0.15s ease;
  }

  :global(.nav-btn:hover:not(:disabled):not([data-disabled])) {
    background: color-mix(in srgb, var(--mcc-bg-surface) 78%, white 14%);
    border-color: var(--mcc-accent);
    transform: translateY(-1px);
  }

  :global(.nav-btn:disabled),
  :global(.nav-btn[data-disabled]) {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
    transform: none;
  }
</style>
