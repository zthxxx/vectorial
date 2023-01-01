
import { create } from 'zustand'

import type {
  ToolDefine,
} from './types'

export type Tools = ToolDefine[]

export interface ToolsStore {
  tools: Tools,
  toolsMap: { [name: string]: ToolDefine },
  current: string,
  switchTool: (name: string) => void,
}

export const useToolsStore = create<ToolsStore>(() => ({
  tools: [],
  toolsMap: {},
  current: '',
  switchTool: () => {},
}))

