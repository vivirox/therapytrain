const globals = require('globals');
const security = require('eslint-plugin-security');
const eslintRecommended = {
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
  },
};

module.exports = [
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
    plugins: {
      security,
    },
    rules: {
      ...eslintRecommended.rules,
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-unsafe-regex': 'warn',
    },
  },
  security.configs.recommended,
];