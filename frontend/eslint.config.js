import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    // Ignore build output and generated docs
    globalIgnores(['dist', 'docs']),

    // Browser globals for plain JS files in public/
    {
        files: ['public/**/*.js'],
        languageOptions: {
            globals: globals.browser,
        },
    },

    // Base recommended configs
    js.configs.recommended,
    ...tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,

    {
        files: ['**/*.{ts,tsx}'],

        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: globals.browser,
        },

        plugins: {
            '@stylistic': stylistic,
        },

        rules: {
            /*
            =====================================================
            CODE STYLE / FORMATTING
            Enforces consistent formatting across the project.
            These replace what Prettier would typically handle.
            =====================================================
            */

            // Use 4-space indentation
            '@stylistic/indent': ['error', 4],

            // Require semicolons
            '@stylistic/semi': ['error', 'always'],

            // Enforce single quotes
            '@stylistic/quotes': ['error', 'single'],

            // Require trailing commas in multiline structures
            '@stylistic/comma-dangle': ['error', 'always-multiline'],

            // Require spaces inside braces: { foo }
            '@stylistic/object-curly-spacing': ['error', 'always'],

            // Disallow spaces inside brackets: [1,2]
            '@stylistic/array-bracket-spacing': ['error', 'never'],

            // Require space before blocks
            '@stylistic/space-before-blocks': ['error'],

            // Enforce consistent keyword spacing
            '@stylistic/keyword-spacing': ['error'],

            // Require spacing around operators
            '@stylistic/space-infix-ops': ['error'],

            // Disallow trailing whitespace
            '@stylistic/no-trailing-spaces': ['error'],

            // Require newline at end of file
            '@stylistic/eol-last': ['error', 'always'],

            // Disallow multiple consecutive spaces (no manual alignment)
            '@stylistic/no-multi-spaces': ['error'],

            // Soft line length limit
            '@stylistic/max-len': [
                'warn',
                {
                    code: 170,
                    ignoreUrls: true,
                },
            ],

            /*
            =====================================================
            CODE QUALITY
            Encourages maintainable and predictable code.
            =====================================================
            */

            // Disallow var
            'no-var': 'error',

            // Prefer const when possible
            'prefer-const': 'error',

            // Require strict equality
            'eqeqeq': 'error',

            // Prefer template literals over string concatenation
            'prefer-template': 'error',

            // Enforce shorthand object properties: { foo } not { foo: foo }
            'object-shorthand': 'error',

            // Disallow nested ternary expressions
            'no-nested-ternary': 'error',

            // Disallow unnecessary ternaries: x === true ? true : false → just x
            'no-unneeded-ternary': 'error',

            // Warn on console.log left in code
            'no-console': 'warn',

            /*
            =====================================================
            EARLY RETURN & CONTROL FLOW
            Enforces flat, readable code with early exits.
            =====================================================
            */

            // Always require curly braces — no single-line ifs
            'curly': ['error', 'all'],

            // Force if/else bodies onto their own lines — no { return x; } on one line
            '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],

            // Require blank line before `if` when preceded by a block (e.g. another if)
            '@stylistic/padding-line-between-statements': [
                'error',
                { blankLine: 'always', prev: 'block-like', next: 'if' },
            ],

            // Disallow else after return — enforce early return
            'no-else-return': ['error', { allowElseIf: false }],

            // Disallow if as the only statement inside else (use else-if instead, then remove it)
            'no-lonely-if': 'error',

            // Limit nesting depth — encourages early return
            'max-depth': ['warn', 3],
            'max-nested-callbacks': ['warn', 3],
            'complexity': ['warn', 8],

            /*
            =====================================================
            TYPESCRIPT
            =====================================================
            */

            // Disallow explicit any — use proper types
            '@typescript-eslint/no-explicit-any': 'error',

            // Ignore unused args prefixed with _
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],

            // Enforce `import type` for type-only imports
            '@typescript-eslint/consistent-type-imports': 'error',

            // Enforce consistent array type: Array<T> vs T[]
            '@typescript-eslint/array-type': ['error', { default: 'array' }],

            /*
            =====================================================
            REACT / VITE
            =====================================================
            */

            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
        },
    },
]);
