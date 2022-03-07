import { memo, useEffect, useState, useCallback } from 'react'
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
  Bar,
  Tray,
} from './components'
import {
  ToolDefine,
  ToolProps,
} from './types'
import { SelectTool } from './selection'
import { VectorTool } from './vector'
import { PanTool } from './pan'
import { BooleanOperation } from './boolean'


type Tools = ToolDefine[]

export const toolState = {
  tools: [] as Tools,
  toolsMap: {} as { [name: string]: ToolDefine },
  current: '',
  switchTool: (name: string) => {},
}

const useTools = (): [Tools, (set: Tools) => void] => {
  const [, setup] = useState<number>(Math.random())
  const set = (tools: Tools) => {
    setup(Math.random())
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

  const switchTool = (name: string) => {
    const { current, toolsMap } = toolState
    const currentTool = toolsMap[current]
    const nextTool = toolsMap[name]
    if (name === current) return
    currentTool?.deactivate()
    nextTool?.activate()
    toolState.current = name
    setCurrent(name)
  }

  const tools = useSetupTools({
    user,
    scene,
    switchTool: (name: string) => toolState.switchTool(name),
  })

  useEffect(() => {
    if (!tools.length) return
    toolState.switchTool = switchTool
    const { events } = scene
    switchTool('SelectTool')
    const hotkey = events.interactEvent$.pipe(
      filter(event => (
        event.key?.type === KeyTriggerType.Down
      )),
      map(event => tools.find(item => event.match(item.hotkey))),
      tap(tool => tool && switchTool(tool.name)),
    ).subscribe()
    return () => {
      hotkey.unsubscribe()
      toolState.switchTool = () => {}
    }
  }, [tools])

  return (
    <Bar>
      {tools.map((tool) => (
        <Tray
          key={tool.name}
          title={`${tool.label} (${tool.hotkeyLabel})`}
          active={tool.name === current}
          onClick={() => switchTool(tool.name)}
        >
          {tool.icon}
        </Tray>
      ))}

      <div
        className='w-px h-6 bg-gray-300 mx-2'
      />

      <BooleanOperation
        user={user}
        scene={scene}
        switchTool={switchTool}
      />
    </Bar>
  )
})
