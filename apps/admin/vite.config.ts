import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [vue()],
  server: {
    proxy: {
      // API (NestJS) 默认端口
      '^/admin': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '^/api/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '^/api.php': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '^/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
