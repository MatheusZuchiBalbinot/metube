import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
	// Ignore build output
	globalIgnores(['dist']),

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

			// No semicolons
			'@stylistic/semi': ['error', 'never'],

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

			/*
			Encourages early-return patterns by limiting nesting
			*/
			'max-depth': ['warn', 3],
			'max-nested-callbacks': ['warn', 3],
			'complexity': ['warn', 8],

			/*
			=====================================================
			TYPESCRIPT
			=====================================================
			*/

			// Ignore unused args prefixed with _
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_' },
			],

			// Enforce `import type`
			'@typescript-eslint/consistent-type-imports': 'error',

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
])
