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

export const enterMovingNode: GuardAction = (interactionEvent$, context) => {
  const {
    layerManager,
    machine,
  } = context

  interactionEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => defer(() => {
      const {
        isDrag,
        isClickUp,
      } = normalizeMouseEvent(event, layerManager)

      if (isDrag) {
        return of<StateMouseEvent>({ type: 'move', event })
      } else if (isClickUp) {
        return of<StateMouseEvent>({ type: 'done', event })
      } else {
        return EMPTY
      }
    })),
    tap((event: StateMouseEvent) => { machine?.send(event) }),
  ).subscribe()
}


export const movingNodeAction: StateAction = (context, { event }: StateMouseEvent) => {
  const {
    layerManager,
  } = context
  const { dragging } = event
  if (!dragging) return

  const { selected } = layerManager
  selected.forEach(node => {
    node.path.move(dragging.delta)
    node.draw()
  })
}
