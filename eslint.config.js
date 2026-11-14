// SPDX-License-Identifier: AGPL-3.0-or-later
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/.svelte-kit/**',
      '**/.wrangler/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'apps/android/android/**',
      'apps/api/worker-configuration.d.ts',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // domain/server code gets `now` injected (CLAUDE.md); tests and UI glue may use real time
    files: ['packages/shared/src/**/*.ts', 'apps/api/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Use an injected Clock / now parameter instead of Date.now().',
        },
      ],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] } },
    rules: {
      // SPA with adapter-static and base path '' – plain hrefs are fine.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
);
