import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configura\u00e7\u00e3o Vite: https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
