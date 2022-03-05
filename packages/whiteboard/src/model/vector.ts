import { generateKeyBetween } from 'fractional-indexing'
import { nanoid } from '@vectorial/whiteboard/utils'
import {
  NodeType,
  VectorData,
  BlendMode,
} from './types'

export const newVectorNode = ({ id, name }: {
  id?: string;
  name?: string;
} = {}): VectorData => {
  return {
    id: id ?? nanoid(),
    name: name ?? `Vector 1`,
    type: NodeType.Vector,
    order: generateKeyBetween(null, null),

    position: { x: 0, y: 0 },
    rotation: 0,

    opacity: 1,
    blendMode: BlendMode.PassThrough,

    stroke: {
      width: 2,
      paints: [{
        id: nanoid(),
        type: 'Solid',
        color: '#c4c4c4',
      }],
    },
    fill: {
      paints: [{
        id: nanoid(),
        type: 'Solid',
        color: '#c4e4c4',
      }],
    },
    path: {
      type: 'Path',
      anchors: [],
      closed: false,
      position: { x: 0, y: 0 },
      rotation: 0,
      parity: 1,
    },
  }
}
