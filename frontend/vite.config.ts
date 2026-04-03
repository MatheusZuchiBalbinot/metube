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
                manualChunks: (id: string) => {
                    if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
                        return 'vendor-react';
                    }
                    if (id.includes('node_modules/framer-motion') || id.includes('node_modules/@radix-ui')) {
                        return 'vendor-ui';
                    }
                    if (id.includes('node_modules/@reduxjs/toolkit') || id.includes('node_modules/react-redux')) {
                        return 'vendor-state';
                    }
                    if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
                        return 'vendor-i18n';
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
