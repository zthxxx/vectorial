import {
  Color,
} from '@vectorial/whiteboard/model'


export * from './id'
export * from './yjs'
export * from './logger'

export const toPixiColor = (color: Color): number => {
  return Number(color.replace('#', '0x'))
}
