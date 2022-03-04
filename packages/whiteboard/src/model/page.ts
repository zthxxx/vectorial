import { generateKeyBetween } from 'fractional-indexing'
import { nanoid } from '@vectorial/whiteboard/utils'
import {
  NodeType,
  PageData,
} from './types'

export const newPage = (): PageData => ({
  id: nanoid(),
  name: `Page 1`,
  type: NodeType.Page,
  order: generateKeyBetween(null, null),
  children: [],
  nodes: {},
})
