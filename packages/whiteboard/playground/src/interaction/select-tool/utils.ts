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
  PathNode,
} from '../../nodes'
import type {
  LayerManager,
} from '../layer'
import {
  MouseTriggerType,
  MouseButton,
} from '../event'

import {
  MouseEvent,
  StateAction,
  GuardAction,
} from './types'

export const findHitPath = (
  layerManager: LayerManager,
  point: Vector,
): PathNode | undefined => layerManager.find(
  node => Boolean(node.path.hitAreaTest(point) || node.path.hitPathTest(point)),
)

export const createEventGuard = (entry: GuardAction, exit?: StateAction): {
  entry: StateAction;
  exit: StateAction;
} => {
  const rests$ = new Subject<void>()

  return {
    entry: (context) => {
      const { interactionEvent$ } = context
      const event$ = interactionEvent$.pipe(
        takeUntil(rests$),
      )
      entry(
        event$,
        context,
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
  layerManager: LayerManager,
): {
  hit?: PathNode | undefined;
  isMove: boolean;
  isClickDown: boolean;
  isClickUp: boolean;
  isDrag: boolean;
} => ({
  hit: findHitPath(layerManager, event.mouse),
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
