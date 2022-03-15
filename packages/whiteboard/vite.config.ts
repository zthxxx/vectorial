import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  server: {
    open: true,
  },

  plugins: [
    tsconfigPaths(),
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
