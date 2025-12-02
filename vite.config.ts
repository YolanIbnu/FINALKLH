import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 🔥 tambahkan ini biar asset jalan di Netlify
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
