/// <reference types="vite/client" />

declare module '*.svg?component' {
  import type { SvelteComponent } from 'svelte';
  const content: typeof SvelteComponent;
  export default content;
}
