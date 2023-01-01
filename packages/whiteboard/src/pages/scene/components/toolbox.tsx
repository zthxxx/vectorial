import { memo, useEffect } from 'react'
import {
  tap,
  map,
  filter,
} from 'rxjs/operators'
import { keyBy } from 'lodash-es'
import {
  type ScenePluginProps,
  KeyTriggerType,
  type Tools,
  type ToolProps,
  SelectTool,
  VectorTool,
  PanTool,
  BooleanOperationTool,
  useToolsStore,
} from '@vectorial/whiteboard/scene'
import {
  Bar,
  Tray,
} from '@vectorial/whiteboard/components'



const useSetupTools = (toolProps: ToolProps): Tools => {
  const tools = useToolsStore(state => state.tools)

  if (tools.length) return tools

  const setTools = (tools: Tools) => {
    useToolsStore.setState({
      tools,
      toolsMap: keyBy(tools, 'name'),
    })
  }

  setTools([
    new SelectTool(toolProps),
    new VectorTool(toolProps),
    new PanTool(toolProps),
  ])

  return tools
}

const switchTool = (name: string) => {
  const { current, toolsMap } = useToolsStore.getState()
  const currentTool = toolsMap[current]
  const nextTool = toolsMap[name]
  if (name === current) return
  currentTool?.deactivate()
  nextTool?.activate()
  useToolsStore.setState({ current: name })
}

export interface ToolboxProps extends ScenePluginProps {}

export const Toolbox = memo((props: ToolboxProps) => {
  const {
    user,
    scene,
  } = props

  const current = useToolsStore(state => state.current)

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

    return () => {
      hotkey.unsubscribe()
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

      <BooleanOperationTool
        user={user}
        scene={scene}
        switchTool={switchTool}
      />
    </Bar>
  )
})
