import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-e2e/**',
      'playwright-report/**',
      'test-results/**',
      '**/node_modules/**',
      'docs/entwuerfe/**',
      '.claude/worktrees/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    // Der Kern muss plattformneutral bleiben: kein DOM, kein Netz, kein Zufall, keine Zeit.
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'fetch',
        'setTimeout',
        'setInterval',
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Im Kern nur den übergebenen Rng nutzen.' },
        { object: 'Date', property: 'now', message: 'Der Kern kennt keine Zeit.' },
      ],
    },
  },
  {
    // Bots entscheiden reproduzierbar: Zufall nur über den Seed, Zeit nur über eine übergebene Uhr.
    files: ['packages/bots/src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'performance', 'setTimeout', 'setInterval'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Bots nutzen nur den Seed.' },
        { object: 'Date', property: 'now', message: 'Bots bekommen eine Uhr übergeben.' },
      ],
    },
  },
  {
    // Der Tutor rechnet wie die Bots: Zufall nur über den Seed, keine Zeit, kein Netz, keine Oberfläche.
    files: ['packages/tutor/src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'performance', 'setTimeout', 'setInterval'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Der Tutor nutzt nur den Seed.' },
        { object: 'Date', property: 'now', message: 'Der Tutor bekommt eine Uhr übergeben.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@schafkopf/net', '@schafkopf/web', 'react', 'react-dom'],
              message: 'Der Tutor hängt nur von core und bots ab.',
            },
          ],
        },
      ],
    },
  },
);
