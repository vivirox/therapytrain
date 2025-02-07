export default {
    root: true,
    env: {
        browser: true,
        es2020: true,
        node: true,
    },
    extends: [
        'next/core-web-vitals',
        'plugin:@typescript-eslint/recommended',
        'plugin:jest/recommended',
    ],
    plugins: [
        '@typescript-eslint',
        'jest',
        'react-hooks',
        'react-refresh',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
    rules: {
        // Disable strict TypeScript rules temporarily
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-unsafe-function-type': 'off',
        '@typescript-eslint/no-wrapper-object-types': 'off',

        // Keep important React rules as warnings
        'react-hooks/rules-of-hooks': 'warn',
        'react-hooks/exhaustive-deps': 'warn',
        'react-refresh/only-export-components': 'warn',

        // Other rules
        'no-unused-vars': 'off',
        'prefer-const': 'warn',
        'no-var': 'warn',
        'no-constant-condition': 'warn',
        'no-useless-catch': 'warn',
        'no-useless-escape': 'warn',
    },
    overrides: [
        // Test files
        {
            files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*', '**/__tests__/**/*'],
            env: {
                jest: true,
            },
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-empty-object-type': 'off',
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-unsafe-return': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-namespace': 'off',
                '@typescript-eslint/no-require-imports': 'off',
                '@typescript-eslint/no-unsafe-function-type': 'off',
                '@typescript-eslint/no-wrapper-object-types': 'off',
                'no-unused-vars': 'off',
            },
        },
        // Type definition files
        {
            files: ['**/*.d.ts', '**/types/**/*.ts'],
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-empty-object-type': 'off',
            },
        },
        // Backend files
        {
            files: ['backend/**/*.ts'],
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-empty-object-type': 'off',
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-unsafe-return': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-namespace': 'off',
                '@typescript-eslint/no-require-imports': 'off',
            },
        },
        // Frontend files
        {
            files: ['frontend/**/*.ts', 'frontend/**/*.tsx', 'src/**/*.ts', 'src/**/*.tsx'],
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-empty-object-type': 'off',
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-unsafe-return': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/no-empty-function': 'off',
            },
        },
    ],
};
