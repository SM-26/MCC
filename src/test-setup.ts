// src/test-setup.ts
// Polyfill window.localStorage for Node.js 26+ / happy-dom compatibility.
// Node.js 26 exposes an experimental (disabled) localStorage on globalThis, which
// can prevent happy-dom from setting window.localStorage correctly.
if (typeof window !== 'undefined' && !window.localStorage) {
  const _store = new Map<string, string>();
  const storage: Storage = {
    getItem: (key: string) => _store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      _store.set(key, value);
    },
    removeItem: (key: string) => {
      _store.delete(key);
    },
    clear: () => {
      _store.clear();
    },
    get length() {
      return _store.size;
    },
    key: (index: number) => [..._store.keys()][index] ?? null,
  };
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}
