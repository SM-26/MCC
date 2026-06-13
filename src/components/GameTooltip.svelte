<script lang="ts" module>
  // Wrap your reactive state properties inside a frozen, exported object container
  export const toastState = $state({
    activeText: null as string | null,
  });

  let toastTimeout: ReturnType<typeof setTimeout>;

  export function triggerMobileToast(message: string) {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    // Mutate the object property instead of reassigning a root variable
    toastState.activeText = message;

    toastTimeout = setTimeout(() => {
      toastState.activeText = null;
    }, 3000);
  }
</script>

<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    message: string;
    trigger: Snippet;
  }

  const { message, trigger }: Props = $props();

  // Optimized to use modern derived tracking rather than mixing states & effects
  const isMobile = $derived(typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false);
</script>

{#if isMobile}
  <!-- Mobile Mode: Use a clean inline container and target the raw string explicitly -->
  <span
    class="tooltip-mobile-wrapper"
    onclickcapture={(e) => {
      if (!isMobile) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      triggerMobileToast(message); // Guarantees only the pure text string is passed
    }}
    role="button"
    tabindex="0"
  >
    {@render trigger()}
  </span>
{:else}
  <!-- Desktop Mode remains unchanged -->
  <Tooltip.Provider delayDuration={150}>
    <Tooltip.Root>
      <Tooltip.Trigger class="tooltip-desktop-trigger">
        {@render trigger()}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="tooltip-box" side="top" align="center" sideOffset={6}>
          <div class="tooltip-header">Details:</div>
          <p class="tooltip-message">"{message}"</p>
          <Tooltip.Arrow class="tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
{/if}

<style>
  .tooltip-mobile-wrapper {
    cursor: help;
    display: inline-flex;
    align-items: center;
  }

  :global(.tooltip-box) {
    background-color: #0f172a;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 10px 14px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
    max-width: 320px;
    z-index: 200;
  }

  .tooltip-header {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .tooltip-message {
    margin: 0;
    font-size: 0.85rem;
    color: #f1f5f9;
    line-height: 1.4;
    font-family: monospace;
    white-space: pre-wrap;
  }

  :global(.tooltip-arrow) {
    fill: #0f172a;
    stroke: #475569;
    stroke-width: 1px;
  }
</style>
