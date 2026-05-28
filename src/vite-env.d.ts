/// <reference types="vite/client" />
/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ImportMetaEnv {
  readonly BASE_URL: string
  // Add other env variables here if you have them
}
