import {
  tap,
  map,
  filter,
} from 'rxjs/operators'
import {
  type EventObject,
} from 'xstate'
import {
  type MouseEvent,
} from '@vectorial/whiteboard/scene'
import {
  createInteractGuard,
  normalizeMouseEvent,
} from './utils'
import {
  type StateMouseEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
} from './types'



export enum MovingNodeEvent {
  Move = 'Move',
  Done = 'Done',
}

export enum MovingNodeAction {
  Entry = 'MovingNode.Entry',
  Exit = 'MovingNode.Exit',
  Move = 'MovingNode.Move',
  Done = 'MovingNode.Done',
}

export type MovingNodeActions = {
  [MovingNodeAction.Entry]: EventObject;
  [MovingNodeAction.Exit]: EventObject;
  [MovingNodeAction.Move]: StateMouseEvent<MovingNodeEvent.Move>;
}


const movingInteractGuard = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      scene,
      machine,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<MovingNodeActions> => {
        const {
          isDrag,
          isClickUp,
        } = normalizeMouseEvent(event, scene.page, scene.selected)

        if (isDrag) {
          return { type: MovingNodeEvent.Move, event }
        } else if (isClickUp) {
          return { type: MovingNodeEvent.Done }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()
  },
})

export const movingNodeActions: StateActions<StateContext, MovingNodeActions> = {
  [MovingNodeAction.Entry]: movingInteractGuard.entry,
  [MovingNodeAction.Exit]: movingInteractGuard.exit,

  [MovingNodeAction.Move]: (context, { event }) => {
    const {
      scene,
    } = context
    const { dragging } = event
    if (!dragging) return

    const { selected } = scene
    selected.forEach(node => {
      node.moveDelta(dragging.delta)
    })
  },
}
