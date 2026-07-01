<script lang="ts">
  /**
   * Accordion-backed wrapper for one settings section.
   *
   * Keeps the repeated Bits UI accordion structure out of SettingsView
   * while preserving a single place for section title + body rendering.
   */
  import { Accordion } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    value: string;
    title: string;
    children?: Snippet;
  }

  const { value, title, children }: Props = $props();
</script>

<Accordion.Item {value} class="accordion-item">
  <Accordion.Header class="accordion-header">
    <Accordion.Trigger class="accordion-trigger">
      <span>{title}</span>
      <span class="accordion-chevron">▼</span>
    </Accordion.Trigger>
  </Accordion.Header>

  <Accordion.Content class="accordion-content">
    {@render children?.()}
  </Accordion.Content>
</Accordion.Item>

<style>
  /**
   * Settings accordion section shell.
   *
   * Bits UI renders the actual DOM for these primitives, so the selectors
   * must be preserved with :global(...) to avoid Svelte's unused-selector
   * warning.
   */
  :global(.accordion-item) {
    width: 100%;
    overflow: hidden;
    border: 1px solid var(--mcc-border);
    border-radius: 14px;
    background: var(--mcc-panel);
    background-image: var(--mcc-glass-sheen);
    box-shadow:
      0 2px 10px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  :global(.accordion-header) {
    width: 100%;
    margin: 0;
  }

  :global(.accordion-trigger) {
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border: none;
    background: transparent;
    color: var(--mcc-text-main);
    font-family: 'Fredoka', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
    transition: filter 0.15s ease;
  }

  :global(.accordion-trigger:hover) {
    filter: brightness(1.1);
  }

  :global(.accordion-chevron) {
    font-size: 0.65rem;
    opacity: 0.7;
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
    gap: 16px;
    border-top: 1px solid var(--mcc-border);
  }

  :global(.accordion-content[data-state='closed']) {
    display: none;
  }
</style>
