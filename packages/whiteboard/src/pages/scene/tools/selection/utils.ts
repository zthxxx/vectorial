import {
  Subject,
} from 'rxjs'
import {
  takeUntil,
} from 'rxjs/operators'
import {
  Vector,
} from 'vectorial'
import {
  SceneNode,
  PageNode,
} from '@vectorial/whiteboard/nodes'
import {
  MouseTriggerType,
  MouseButton,
} from '@vectorial/whiteboard/scene'

import {
  MouseEvent,
  StateAction,
  GuardAction,
} from './types'

export const findHitPath = (
  page: PageNode,
  point: Vector,
): SceneNode | undefined => page.findChild(
  node => Boolean(node.hitTest(point)),
)

export const createEventGuard = (entry: GuardAction, exit?: StateAction): {
  entry: StateAction;
  exit: StateAction;
} => {
  const rests$ = new Subject<void>()

  return {
    entry: (context, ev) => {
      const { interactEvent$ } = context
      const event$ = interactEvent$.pipe(
        takeUntil(rests$),
      )
      entry(
        event$,
        context,
        ev,
      )
    },
    exit: (context, event, action) => {
      rests$.next()
      exit?.(context, event, action)
    },
  }
}

export const normalizeMouseEvent = (
  event: MouseEvent,
  page: PageNode,
): {
  hit?: SceneNode;
  isMove: boolean;
  isClickDown: boolean;
  isClickUp: boolean;
  isDrag: boolean;
} => ({
  hit: findHitPath(page, event.mouse),
  isMove: event.mouse.type == MouseTriggerType.Move,
  isClickDown: (
    event.mouse.type === MouseTriggerType.Down
    && event.match({ mouse: [MouseButton.Left] })
  ),
  isDrag: (
    Boolean(event.dragging)
    && event.match({ mouse: [MouseButton.Left] })
  ),
  isClickUp: (
    event.mouse.type === MouseTriggerType.Up
    && !event.downMouse.size
  ),
})
