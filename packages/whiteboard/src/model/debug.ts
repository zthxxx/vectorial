import { useStore } from './state'
import * as Y from 'yjs'


export const vectorDebugger = {
  useStore,
  YJS: Y,
}

declare global {
  interface Window {
    vectorDebugger: typeof vectorDebugger
  }
}
