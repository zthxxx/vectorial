import type {
  StateAction,
} from '../types'


export * from './selecting'
export * from './selectConfirming'
export * from './adjusting'
export * from './marqueeing'


export const enterEditing: StateAction = (context) => {
  const {
    indicativeAnchor,
    indicativePath,
    changes,
  } = context
  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])
}
