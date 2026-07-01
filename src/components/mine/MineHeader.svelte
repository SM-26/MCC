<!-- /src/components/mine/MineHeader.svelte -->
<script lang="ts">
  import { Button } from 'bits-ui';

  const {
    shaftIndex = 0,
    shaftTotal = 1,
    canGoPrevious = false,
    canGoNext = false,
    onPreviousShaft,
    onNextShaft,
  }: {
    shaftIndex?: number;
    shaftTotal?: number;
    canGoPrevious?: boolean;
    canGoNext?: boolean;
    onPreviousShaft: () => void;
    onNextShaft: () => void;
  } = $props();
</script>

<header class="header">
  <div class="nav-line">
    <Button.Root class="nav-btn nav-arrow" onclick={onPreviousShaft} disabled={!canGoPrevious}>‹</Button.Root>
    <span class="shaft-label">Shaft <b class="shaft-num">{shaftIndex + 1}</b> / {shaftTotal}</span>
    <Button.Root class="nav-btn nav-arrow" onclick={onNextShaft} disabled={!canGoNext}>›</Button.Root>
  </div>
</header>

<style>
  .header {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: calc(var(--mine-padding) / 3) var(--mine-padding);
    align-self: stretch;
  }

  .nav-line {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    font-weight: 700;
  }

  .shaft-label {
    color: var(--mcc-text-main);
    font-size: 1rem;
  }

  /* Current shaft number — fixed gold app accent */
  .shaft-num {
    color: var(--mcc-gold);
    font-weight: 800;
  }

  /* Secondary / glass buttons (prev, next, …) */
  :global(.nav-btn) {
    min-height: 40px;
    padding: 8px 12px;
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    background-color: var(--mcc-surface-2);
    background-image: var(--mcc-btn-sheen);
    color: var(--mcc-text-main);
    font-weight: 700;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition:
      filter 0.15s ease,
      transform 0.1s ease,
      opacity 0.15s ease;
  }

  :global(.nav-btn:hover:not(:disabled):not([data-disabled])) {
    filter: brightness(1.12);
  }

  :global(.nav-btn:active:not(:disabled):not([data-disabled])) {
    transform: translateY(1px);
  }

  /* Arrow buttons — square icon variant */
  :global(.nav-arrow) {
    flex: 0 0 auto;
    width: 40px;
    padding: 8px 0;
    text-align: center;
  }

  :global(.nav-btn:disabled),
  :global(.nav-btn[data-disabled]) {
    opacity: 0.42;
    cursor: not-allowed;
    pointer-events: none;
    filter: saturate(0.6);
  }
</style>
