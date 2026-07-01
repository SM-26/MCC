// src/lib/applyTheme.ts
//
// Applies the current theme to the DOM. Nothing in the app currently
// writes data-theme onto <body>, so theme switching is inert until this
// is wired up (see HANDOFF.md).
//
// - dark / light  -> body[data-theme='dark'|'light']
// - system        -> resolves to dark/light via prefers-color-scheme
// - user          -> body[data-theme='user'] + inline --mcc-user-color
//
// theme.css derives the entire neutral ground from --mcc-u, so for
// 'user' mode we only need to override that one variable.

import type { ThemeMode } from '../logic/app/settingsTypes';

export function applyTheme(mode: ThemeMode, userColor: string = '#14213d'): void {
  const body = document.body;

  let resolved: 'dark' | 'light' | 'user' = 'dark';
  if (mode === 'light') {
    resolved = 'light';
  } else if (mode === 'user') {
    resolved = 'user';
  } else if (mode === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  body.dataset.theme = resolved;

  if (mode === 'user') {
    body.style.setProperty('--mcc-user-color', userColor);
  } else {
    body.style.removeProperty('--mcc-user-color');
  }
}

// Keeps 'system' in sync when the OS scheme changes while mode === 'system'.
export function watchSystemTheme(getMode: () => ThemeMode, getUserColor: () => string): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => {
    if (getMode() === 'system') {
      applyTheme('system', getUserColor());
    }
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
