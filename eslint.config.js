// # ESLint configuration for Svelte + TypeScript

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'svelte/no-at-html-tags': 'error', // Prevents XSS vulnerabilities
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Too noisy for most devs
      'curly': ['error', 'all'], // Prevents bugs from missing braces in if/else
      'eqeqeq': ['error', 'always'], // Forces === instead of ==
      'quotes': 'off', // Turn off the base ESLint quotes rule
      'no-var': 'error', // Forces modern variable declarations
      'prefer-template': 'warn', // Encourages template literals over string concatenation
    },
  },
  {
    // Ignore files that don't need linting
    ignores: ['dist/', 'node_modules/', '.svelte-kit/', 'vite.config.ts'],
  }
);