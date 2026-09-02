import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y';
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
            'jsx-a11y': jsxA11y,
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

            /*
            =====================================================
            ACCESSIBILITY (jsx-a11y)
            Promoted to 'error' now that the codebase is at zero a11y
            warnings — accessibility regressions block CI. Intentional
            exceptions are documented with per-line eslint-disable, and
            the player widget has its own scoped override (below).
            =====================================================
            */

            'jsx-a11y/alt-text': 'error',
            'jsx-a11y/anchor-has-content': 'error',
            'jsx-a11y/anchor-is-valid': 'error',
            'jsx-a11y/aria-props': 'error',
            'jsx-a11y/aria-proptypes': 'error',
            'jsx-a11y/aria-role': 'error',
            'jsx-a11y/aria-unsupported-elements': 'error',
            'jsx-a11y/click-events-have-key-events': 'error',
            'jsx-a11y/heading-has-content': 'error',
            'jsx-a11y/label-has-associated-control': 'error',
            'jsx-a11y/no-noninteractive-element-interactions': 'error',
            'jsx-a11y/no-redundant-roles': 'error',
            'jsx-a11y/no-static-element-interactions': 'error',
            'jsx-a11y/role-has-required-aria-props': 'error',
            'jsx-a11y/role-supports-aria-props': 'error',
            'jsx-a11y/tabindex-no-positive': 'error',
        },
    },

    {
        // The video player is operated via document-level keyboard shortcuts (usePlayerKeyboard:
        // Space/Arrows/m/f/c/0-9...) plus native <button> controls and an accessible seek slider.
        // The surface / control-bar / stopPropagation-shield divs are deliberate mouse-only
        // enhancements layered on that model, so these two interaction rules don't apply here.
        files: ['src/components/player/**/*.tsx'],
        rules: {
            'jsx-a11y/no-static-element-interactions': 'off',
            'jsx-a11y/click-events-have-key-events': 'off',
        },
    },

    {
        // Generated icon data (one line per icon, mirroring lucide-react's own source
        // layout) — wrapping these to 170 chars would make the file harder to scan, not easier.
        files: ['src/components/icons/icons.tsx'],
        rules: {
            '@stylistic/max-len': 'off',
        },
    },
]);
