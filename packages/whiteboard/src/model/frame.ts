import { generateKeyBetween } from 'fractional-indexing'
import { nanoid } from '@vectorial/whiteboard/utils'
import {
  NodeType,
  FrameData,
  BlendMode,
} from './types'

export const newFrame = (): FrameData => {
  const width = window.innerWidth
  const height = window.innerHeight

  return {
    id: nanoid(),
    name: `Frame 1`,
    type: NodeType.Frame,
    order: generateKeyBetween(null, null),
    children: [],

    // position: { x: 0, y: 0 },
    // width,
    // height,

    position: {
      x: width / 6,
      y: height / 6,
    },
    width: width * 2 / 3,
    height: height * 2 / 3,

    rotation: 0,
    opacity: 1,
    blendMode: BlendMode.PassThrough,

    stroke: {
      width: 0,
      paints: [],
    },
    fill: {
      paints: [{
        id: nanoid(),
        type: 'Solid',
        color: '#ffffff',
      }],
    },
  }
}
