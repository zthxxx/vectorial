import { memo, useEffect, useCallback } from 'react'
import { atom, useAtom } from 'jotai'
import {
  tap,
  map,
  filter,
} from 'rxjs/operators'
import { keyBy } from 'lodash-es'
import {
  ScenePluginProps,
  KeyTriggerType,
} from '@vectorial/whiteboard/scene'
import {
  ToolDefine,
  ToolProps,
} from './types'
import { SelectTool } from './selection'
import { VectorTool } from './vector'
import { PanTool } from './pan'

type Tools = ToolDefine[]

export const toolState = {
  tools: [] as Tools,
  toolsMap: {} as { [name: string]: ToolDefine },
  current: '',
}

const useTools = (): [Tools, (set: Tools) => void] => {
  const set = (tools: Tools) => {
    toolState.tools = tools
    toolState.toolsMap = keyBy(tools, 'name')
  }
  return [toolState.tools, set]
}

const useSetupTools = (toolProps: ToolProps): Tools => {
  const [tools, setTools] = useTools()
  if (tools.length) return tools

  setTools([
    new SelectTool(toolProps),
    new VectorTool(toolProps),
    new PanTool(toolProps),
  ])
  return tools
}

export const currentToolAtom = atom('')

export interface ToolboxProps extends ScenePluginProps {

}

export const Toolbox = memo((props: ToolboxProps) => {
  const {
    user,
    scene,
  } = props

  const [current, setCurrent] = useAtom(currentToolAtom)

  const switchTool = useCallback((name: string) => {
    const { current, toolsMap } = toolState
    const currentTool = toolsMap[current]
    const nextTool = toolsMap[name]
    if (name === current) return
    currentTool?.deactivate()
    nextTool?.activate()
    toolState.current = name
    setCurrent(name)
  }, [])

  const tools = useSetupTools({
    user,
    scene,
    switchTool,
  })

  useEffect(() => {
    if (!tools.length) return
    const { events } = scene
    switchTool('SelectTool')
    const hotkey = events.interactEvent$.pipe(
      filter(event => (
        event.key?.type === KeyTriggerType.Down
      )),
      map(event => tools.find(item => event.match(item.hotkey))),
      tap(tool => tool && switchTool(tool.name)),
    ).subscribe()
    return () => hotkey.unsubscribe()
  }, [tools])

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
