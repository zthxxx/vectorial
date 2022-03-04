import { memo, useRef, useCallback } from 'react'
import { atom, useAtom } from 'jotai'
import { keyBy } from 'lodash-es'
import { ScenePluginProps } from '@vectorial/whiteboard/scene'
import {
  ToolDefine,
  ToolProps,
} from './types'
import { SelectTool } from './selection'
import { VectorTool } from './vector'
import { PanTool } from './pan'

type Tools = ToolDefine[]

export const state = {
  tools: atom<Tools>([]),
  current: atom<string>(''),
}

const useSetupTools = (toolProps: ToolProps): Tools => {
  const [tools, setTools] = useAtom(state.tools)
  if (tools.length) return tools

  setTools([
    new SelectTool(toolProps),
    new VectorTool(toolProps),
    new PanTool(toolProps),
  ])
  return tools
}

export interface ToolboxProps extends ScenePluginProps {

}

export const Toolbox = memo((props: ToolboxProps) => {
  const {
    user,
    scene,
  } = props

  const [current, setCurrent] = useAtom(state.current)
  const toolsMapRef = useRef<{ [name: string]: ToolDefine }>({})
  const toolNameRef = useRef('')

  const switchTool = useCallback((name: string) => {
    const current = toolNameRef.current
    const toolsMap = toolsMapRef.current
    if (name === current) return
    toolsMap[current]?.deactivate()
    toolsMap[name]?.activate()
    setCurrent(name)
    toolNameRef.current = name
  }, [])

  const tools = useSetupTools({
    user,
    scene,
    switchTool,
  })

  const toolsMap = keyBy(tools, 'name')
  toolsMapRef.current = toolsMap

  return (
    <div
      className='
        absolute top-2 px-8 py-1
        flex justify-center items-center
        rounded-lg drop-shadow  bg-white
      '
    >
      {tools.map((tool) => (
        <div
          key={tool.name}
          title={`${tool.label} (${tool.hotkeyLabel})`}
          className={[
            `
              flex justify-center items-center
              w-10 h-10 mx-1
              rounded-md
              cursor-pointer
            `,
            tool.name === current
              ? `bg-pink-400 text-white`
              : `
                text-gray-800
                hover:text-pink-400
              `
          ].join(' ')}
          onClick={() => switchTool(tool.name)}
        >
          {tool.icon}
        </div>
      ))}
    </div>
  )
})
