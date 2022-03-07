import { FC } from 'react'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import tailwind from 'tailwind-styled-components'
import {
  BooleanOperator,
} from 'vectorial'
import {
  icon,
} from '@vectorial/whiteboard/assets'
import {
  useSubscribe,
} from '@vectorial/whiteboard/utils'
import {
  NodeType,
} from '@vectorial/whiteboard/model'
import {
  BooleanOperationNode,
} from '@vectorial/whiteboard/nodes'
import {
  Scene,
  SelectedNodes,
} from '@vectorial/whiteboard/scene'
import {
  Tray,
} from '../components'
import {
  ToolProps,
} from '../types'
import { booleanOperate } from './operate'


const DropdownMenuTrigger = tailwind(DropdownMenu.Trigger)`
  inline-flex items-center justify-center
  h-10
  outline-none
  cursor-default
`
const ChevronIcon = tailwind(ChevronDownIcon)`
  ml-1
`
const DropdownMenuContent = tailwind(DropdownMenu.Content)`
  rounded-md drop-shadow-lg bg-white
`
const DropdownMenuArrow = tailwind(DropdownMenu.Arrow)`
  fill-white shadow-lg drop-shadow-lg
`
const DropdownMenuItem = tailwind(DropdownMenu.Item)`
  flex items-center justify-start
  rounded-sm
  px-3
  w-full h-9
  text-gray-700
  hover:bg-pink-400 hover:text-white
  outline-none
`
const ItemIcon = tailwind.div`
  inline-flex items-center justify-center
`
const ItemName = tailwind.span`
  ml-2 mr-1
  text-sm
`

const isDisable = (selected?: SelectedNodes): boolean =>
  !selected
  || (
    selected.size < 2
    && [...selected][0]?.type !== NodeType.BooleanOperation
  )
  || [...selected].some(node => ![NodeType.BooleanOperation, NodeType.Vector].includes(node.type))

const getOperator = (selected?: SelectedNodes): BooleanOperator => (
  !selected
  || selected.size >= 2
  || [...selected][0]?.type !== NodeType.BooleanOperation
)
  ? BooleanOperator.Union
  : ([...selected][0] as BooleanOperationNode).shape.booleanOperator

export const BooleanOperation: FC<ToolProps> = (props) => {
  const {
    scene,
  } = props

  const selected = useSubscribe(scene.events.selected$)

  const disable = isDisable(selected)
  const operator = getOperator(selected)
  const BooleanIcon = icon[operator]

  return (
    <Tray
      disable={disable}
      className='w-16'
    >
       <DropdownMenu.Root
        {...disable ? { open: false } : {}}
       >
        <DropdownMenuTrigger>
          <ItemIcon>
            <BooleanIcon className='w-5 h-5' />
          </ItemIcon>
          <ChevronIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent
         sideOffset={5}
        >
          <DropdownMenuArrow />

          {Object.values(BooleanOperator).map((operator) => {
            const Icon = icon[operator]
            return (
              <DropdownMenuItem
                key={operator}
                value={operator}
                onSelect={() => booleanOperate(scene, selected!, operator)}
              >
                <ItemIcon>
                  <Icon className='w-5 h-5' />
                </ItemIcon>
                <ItemName>{operator}</ItemName>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu.Root>

    </Tray>
  )
}
