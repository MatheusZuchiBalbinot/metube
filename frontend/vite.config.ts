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
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-ui': ['framer-motion', '@radix-ui/react-tooltip', '@radix-ui/react-popover', '@radix-ui/react-slot'],
                    'vendor-state': ['@reduxjs/toolkit', 'react-redux'],
                    'vendor-i18n': ['i18next', 'react-i18next'],
                },
            },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        alias: {
            '@data': resolve(__dirname, 'src/data'),
            '@utils': resolve(__dirname, 'src/utils'),
            '@hooks': resolve(__dirname, 'src/hooks'),
            '@store': resolve(__dirname, 'src/store'),
            '@models': resolve(__dirname, 'src/types'),
            '@context': resolve(__dirname, 'src/context'),
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
