import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

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
      '@vectorial/whiteboard': path.resolve('./src'),
    },
  },
  plugins: [
    react({
      fastRefresh: false,
      babel: {
        plugins: [
          'jotai/babel/plugin-debug-label',
          '@emotion/babel-plugin',
        ],
      },
    }),
    // https://github.com/pd4d10/vite-plugin-svgr
    svgr({
      // https://react-svgr.com/docs/options
      svgrOptions: {
        icon: true,
      },
    }),
  ]
})
