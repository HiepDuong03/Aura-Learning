import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { youtubeCaptionPlugin } from './src/server/youtubeCaptionPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), youtubeCaptionPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api/youtube-oembed': {
        target: 'https://www.youtube.com/oembed',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/youtube-oembed/, ''),
      },
      '/api/auth': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/sync': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/admin': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/ai': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/dict': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/health': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
