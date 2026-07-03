import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const BACKEND = 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': BACKEND,
      '/c': BACKEND, // 번들·미디어 서빙
      '/p': BACKEND, // 미리보기(단기 토큰) 서빙
    },
  },
})
