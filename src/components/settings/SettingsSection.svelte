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
    border: 1px solid #334155;
    border-radius: 12px;
    background: #1e293b;
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
    padding: 20px;
    border: none;
    background: transparent;
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
    color: #94a3b8;
    font-size: 0.65rem;
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
</style>
