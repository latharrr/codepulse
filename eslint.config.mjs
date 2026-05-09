// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Disallow any usage — enforce type safety
      '@typescript-eslint/no-explicit-any': 'error',
      // Require consistent type assertions
      '@typescript-eslint/consistent-type-assertions': 'error',
      // Require explicit return types on public functions
      '@typescript-eslint/explicit-function-return-type': 'off', // too noisy for React
      // No unused vars (use _ prefix to ignore)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // No floating promises
      '@typescript-eslint/no-floating-promises': 'error',
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/*.js',    // compiled output
      '**/*.cjs',
      '**/*.mjs',
      '**/prisma/generated/**',
    ],
  },
);
