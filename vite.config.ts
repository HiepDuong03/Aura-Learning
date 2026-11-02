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
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
