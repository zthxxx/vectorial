import type {
  StateAction,
  StateMouseEvent,
} from '../types'


export * from './selecting'
export * from './selectConfirming'
export * from './adjusting'
export * from './marqueeing'


export const enterEditing: StateAction = (context, { event }: StateMouseEvent) => {
  const {
    vectorPath,
    machine,
    indicativeAnchor,
    indicativePath,
    changes,
  } = context
  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])
  if (vectorPath.anchors.length < 2) {
    machine?.send({ type: 'cancel', event })
  }
}
