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
    layerManager,
    machine,
  } = context

  interactionEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => defer(() => {
      const {
        hit,
        isMove,
        isClickDown,
      } = normalizeMouseEvent(event, layerManager)

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
    layerManager,
    selectCache,
  } = context
  const { selected } = layerManager
  const node = hit
  if (!node) {
    context.hoverNode = undefined
    if (selectCache.size) {
      selectCache.clear()
    }
    return
  }
  if (selected.has(node)) {
    selectCache.clear()
  }
  selectCache.add(node)
  context.hoverNode = node
}


export const selectingSelect: StateAction = (context, { event, hit }: StateMouseEvent) => {
  const {
    layerManager,
    selectCache,
  } = context
  const { selected } = layerManager
  const isMultiSelect = event.shiftKey
  selectCache.clear()
  context.hoverNode = undefined

  if (!hit) {
    if (!isMultiSelect) {
      selected.clear()
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
}

export const enterSelectConfirming: GuardAction = (interactionEvent$, context) => {
  const {
    layerManager,
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
      } = normalizeMouseEvent(event, layerManager)


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
    layerManager,
    selectCache,
  } = context
  if (!hit || !selectCache) return
  selectCache.clear()
  const { selected } = layerManager

  const isMultiSelect = event.shiftKey
  if (isMultiSelect) {
    selected.delete(hit)
  } else {
    selected.clear()
    selected.add(hit)
  }
}
