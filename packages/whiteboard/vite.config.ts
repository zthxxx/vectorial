import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  server: {
    open: true,
  },
  optimizeDeps: {
    exclude: ['vectorial'],
  },
  resolve: {
    alias: {
      vectorial: path.resolve('../vectorial/src'),
    },
  },
  plugins: [
    react({
      fastRefresh: false,
    }),
  ]
})
