import type {
  StateContext,
  StateAction,
} from '../types'


export enum EditingAction {
  Entry = 'Editing.Entry',
}

const enterEditing: StateAction<StateContext> = (context) => {
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
    machine?.stop()
  }
}

export const editingActions = {
  [EditingAction.Entry]: enterEditing,
}
