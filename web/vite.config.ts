import path from 'node:path'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    UnoCSS(),
    legacy({
      targets: ['chrome>=70'],
      modernPolyfills: true,
    }),
  ],

  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
