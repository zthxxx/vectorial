import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  server: {
    open: true,
    proxy: {
      // Proxying websockets or socket.io: 
      // ws://${host}/socket.io -> ws://localhost:5174/socket.io
      '/socket.io': {
        // dev websocket server in `packages/simple-server`
        target: 'ws://localhost:2234',
        ws: true,
      },
    }
  },

  plugins: [
    tsconfigPaths(),
    react({
      fastRefresh: false,
      babel: {
        plugins: [
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
  ],

  build: {
    minify: false,
  },
})
