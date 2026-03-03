module.exports = [
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        indexedDB: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        module: 'readonly',
        require: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
    },
  },
];
