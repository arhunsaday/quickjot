import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['quickjot.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'QuickJot',
        short_name: 'QuickJot',
        description: 'A serverless notepad. Your note lives entirely in its own URL.',
        theme_color: '#1a1b1e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Every note is a URL against the app shell, so all navigations resolve to it.
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    // The editor stack is large; splitting it keeps the shell fast to boot.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('lowlight') || id.includes('highlight.js')) return 'highlight'
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor'
          if (id.includes('@radix-ui')) return 'ui'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The editor extension list pulls in TSX, so the transform pipeline is used.
  },
})
