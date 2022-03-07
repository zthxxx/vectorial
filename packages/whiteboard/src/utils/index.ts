import {
  Color,
} from '@vectorial/whiteboard/model'


export * from './id'
export * from './yjs'
export * from './logger'
export * from './rxjs'
export * from './tailwind'
export * from './order'


export const toPixiColor = (color: Color): number => {
  return Number(color.replace('#', '0x'))
}


export const isSameSet = (setA: Set<any>, setB: Set<any>): boolean => {
  if (setA.size !== setB.size) {
    return false
  }
  for (const key of setA) {
    if (!setB.has(key)) {
      return false
    }
  }
  return true
}
