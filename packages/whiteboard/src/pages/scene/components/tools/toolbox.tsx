import { atom, useAtom } from 'jotai'
import {
  ToolDefine,
} from './types'
import {
  icon,
} from '@vectorial/whiteboard/assets'

export interface ToolboxProps {

}

export const toolState = {
  tools: atom<ToolDefine[]>([
    {
      name: 'selection',
      label: 'Selection',
      Icon: icon.Arrow,
      key: ['KeyV'],
      activate: () => {},
      deactivate: () => {},
    },

    {
      name: 'vector',
      label: 'Vector',
      Icon: icon.Pen,
      key: ['KeyP'],
      activate: () => {},
      deactivate: () => {},
    },

    {
      name: 'move',
      label: 'Move',
      Icon: icon.Hand,
      key: ['KeyH'],
      activate: () => {},
      deactivate: () => {},
    }
  ]),
  current: atom<ToolDefine | null>(null),
}

export const Toolbox = () => {
  const [tools] = useAtom(toolState.tools)
  const [current, setCurrent] = useAtom(toolState.current)

  return (
    <div
      className='
        absolute top-2 px-8 py-1
        flex justify-center items-center
        rounded-lg drop-shadow  bg-white
      '
    >
      {tools.map(tool => (
        <div
          key={tool.name}
          title={`${tool.label} (${tool.key.join('+').replace(/Key/, '')})`}
          className={[
            `
              flex justify-center items-center
              w-10 h-10 mx-1
              rounded-md
              cursor-pointer
            `,
            tool.name === current?.name
              ? `bg-pink-400 text-white`
              : `
                text-gray-800
                hover:text-pink-400
              `
          ].join(' ')}
          onClick={() => {
            if (tool.name === current?.name) return
            current?.deactivate()
            setCurrent(tool)
            tool.activate()
          }}
        >
          <tool.Icon
            alt={tool.label}
            className='w-6 h-6'
          />
        </div>
      ))}
    </div>
  )
}
