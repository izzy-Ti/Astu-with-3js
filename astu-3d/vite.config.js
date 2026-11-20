import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        visit: resolve(import.meta.dirname, 'visit.html'),
      },
    },
  },
})
