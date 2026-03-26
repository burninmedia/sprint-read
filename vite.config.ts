import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Capacitor WebView requires relative asset paths
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
  build: {
    // Ensure the PDF worker in /public is copied to dist
    assetsInlineLimit: 0,
  },
})
