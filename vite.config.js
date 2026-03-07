import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import path from 'path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    base: './',  // Relative paths for Electron production builds
    resolve: {
        dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
        alias: {
            'react': path.resolve('./node_modules/react'),
            'react-dom': path.resolve('./node_modules/react-dom'),
            'react-router': path.resolve('./node_modules/react-router'),
            'react-router-dom': path.resolve('./node_modules/react-router-dom'),
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    server: {
        port: 5173,
        strictPort: true,
        host: true, // Expose on LAN/Tailscale for remote access
        open: false,
        proxy: {
            '/api': 'http://localhost:3001'
        }
    }
})

