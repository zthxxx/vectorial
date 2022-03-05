import {
  of,
  defer,
  EMPTY,
} from 'rxjs'
import {
  tap,
  filter,
  mergeMap,
} from 'rxjs/operators'
import {
  StateAction,
  StateMouseEvent,
  GuardAction,
  MouseEvent,
} from './types'
import {
  normalizeMouseEvent,
} from './utils'

export const enterSelecting: GuardAction = (interactionEvent$, context) => {
  const {
    scene,
    machine,
  } = context

  interactionEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => defer(() => {
      const {
        hit,
        isMove,
        isClickDown,
      } = normalizeMouseEvent(event, scene.page)

      if (isMove) {
        return of<StateMouseEvent>({ type: 'move', event, hit })
      } else if (hit && isClickDown) {
        if (event.isDoubleClick) {
          return of<StateMouseEvent>({ type: 'enterNode', event, hit })
        }
        return of<StateMouseEvent>({ type: 'select', event, hit })
      } else if (isClickDown) {
        return of<StateMouseEvent>({ type: 'marquee', event })
      } else {
        return EMPTY
      }
    })),
    tap((event: StateMouseEvent) => { machine?.send(event) }),
  ).subscribe()
}


export const selectingMove: StateAction = (context, { hit }: StateMouseEvent) => {
  const {
    scene,
    selectCache,
  } = context
  const { selected } = scene
  const node = hit
  if (!node) {
    scene.hovered = undefined
    if (selectCache.size) {
      selectCache.clear()
    }
    return
  }
  if (selected.has(node)) {
    selectCache.clear()
  }
  selectCache.add(node)
  scene.hovered = node
}


export const selectingSelect: StateAction = (context, { event, hit }: StateMouseEvent) => {
  const {
    scene,
    selectCache,
    setSelected,
  } = context
  const { selected } = scene
  const isMultiSelect = event.shiftKey
  selectCache.clear()
  scene.hovered = undefined

  if (!hit) {
    if (!isMultiSelect) {
      selected.clear()
      setSelected(selected)
    }
    return
  }

  if (selected.has(hit)) {
    // leave selectCache to `selectConfirming` for mark them as need unselect
    selectCache.add(hit)
    return
  }
  if (!isMultiSelect) {
    selected.clear()
  }

  selected.add(hit)
  setSelected(selected)
}

export const enterSelectConfirming: GuardAction = (interactionEvent$, context) => {
  const {
    scene,
    machine,
    selectCache,
  } = context

  interactionEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => defer(() => {
      const {
        hit,
        isDrag,
        isClickUp,
      } = normalizeMouseEvent(event, scene.page)


      if (isDrag) {
        return of<StateMouseEvent>({ type: 'moveNode', event, hit })
      } else if (isClickUp) {
        // selectCache set selectingSelect in to mark them as need unselect
        if (selectCache.size) {
          return of<StateMouseEvent>({ type: 'unselect', event, hit })
        }
        return of<StateMouseEvent>({ type: 'cancel', event })
      } else {
        return EMPTY
      }
    })),
    tap((event: StateMouseEvent) => { machine?.send(event) }),
  ).subscribe()
}


export const confirmingUnselect: StateAction = (context, { event, hit }: StateMouseEvent) => {
  const {
    scene,
    selectCache,
    setSelected,
  } = context
  if (!hit || !selectCache) return
  selectCache.clear()
  const { selected } = scene

  const isMultiSelect = event.shiftKey
  if (isMultiSelect) {
    selected.delete(hit)
  } else {
    selected.clear()
    selected.add(hit)
  }

  setSelected(selected)
}
