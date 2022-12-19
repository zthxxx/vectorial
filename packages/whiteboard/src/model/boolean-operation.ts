import { generateKeyBetween } from 'fractional-indexing'
import { cloneDeep } from 'lodash-es'
import {
  BooleanOperator,
} from 'vectorial'
import { nanoid } from '@vectorial/whiteboard/utils'
import {
  NodeType,
  BooleanOperationData,
  BlendMode,
  GeometryMixin,
} from './types'

export const newBooleanOperationData = ({ id, name, booleanOperator, geometry }: {
  id?: string;
  name?: string;
  booleanOperator?: BooleanOperator;
  geometry?: GeometryMixin;
} = {}): BooleanOperationData => {
  return {
    id: id ?? nanoid(),
    name: name ?? `BooleanOperation 1`,
    type: NodeType.BooleanOperation,
    order: generateKeyBetween(null, null),
    booleanOperator: booleanOperator ?? BooleanOperator.Union,

    position: { x: 0, y: 0 },
    rotation: 0,

    opacity: 1,
    blendMode: BlendMode.PassThrough,

    stroke: geometry?.stroke 
      ? cloneDeep(geometry.stroke) 
      : {
        width: 0,
        paints: [],
      },
    fill: geometry?.fill
      ? cloneDeep(geometry.fill)
      : {
        paints: [],
      },
    children: [],
  }
}
