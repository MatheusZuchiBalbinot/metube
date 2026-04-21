import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            '@context': resolve(__dirname, 'src/context'),
            '@components': resolve(__dirname, 'src/components'),
            '@ui': resolve(__dirname, 'src/components/ui'),
            '@pages': resolve(__dirname, 'src/pages'),
            '@styles': resolve(__dirname, 'src/styles'),
            '@data': resolve(__dirname, 'src/data'),
            '@utils': resolve(__dirname, 'src/utils'),
            '@hooks': resolve(__dirname, 'src/hooks'),
            '@store': resolve(__dirname, 'src/store'),
            '@models': resolve(__dirname, 'src/types'),
            '@validation': resolve(__dirname, 'src/validation'),
        },
    },
    plugins: [
        tailwindcss(),
        react({
            babel: {
                plugins: [['babel-plugin-react-compiler']],
            },
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id: string) => {
                    const CHUNK_RULES: [string[], string][] = [
                        [['node_modules/react', 'node_modules/react-dom', 'node_modules/react-router-dom'], 'vendor-react'],
                        [['node_modules/framer-motion', 'node_modules/@radix-ui'], 'vendor-ui'],
                        [['node_modules/@reduxjs/toolkit', 'node_modules/react-redux'], 'vendor-state'],
                        [['node_modules/i18next', 'node_modules/react-i18next'], 'vendor-i18n'],
                    ];

                    for (const [patterns, chunk] of CHUNK_RULES) {
                        const isMatch = patterns.some(p => id.includes(p));
                        if (isMatch) {
                            return chunk;
                        }
                    }
                },
            },
        },
    },
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.{ts,tsx}'],
        setupFiles: ['tests/setup.ts'],
        alias: {
            '@components': resolve(__dirname, 'src/components'),
            '@context': resolve(__dirname, 'src/context'),
            '@data': resolve(__dirname, 'src/data'),
            '@hooks': resolve(__dirname, 'src/hooks'),
            '@models': resolve(__dirname, 'src/types'),
            '@pages': resolve(__dirname, 'src/pages'),
            '@store': resolve(__dirname, 'src/store'),
            '@styles': resolve(__dirname, 'src/styles'),
            '@ui': resolve(__dirname, 'src/components/ui'),
            '@utils': resolve(__dirname, 'src/utils'),
            '@validation': resolve(__dirname, 'src/validation'),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
            '/sanctum': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
        },
    },
});
