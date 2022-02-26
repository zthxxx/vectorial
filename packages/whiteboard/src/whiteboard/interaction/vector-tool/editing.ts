import {
  of,
  iif,
  EMPTY,
} from 'rxjs'
import {
  tap,
  map,
  filter,
  mergeMap,
} from 'rxjs/operators'
import {
  HandlerType,
  sub,
  PathHitType,
} from 'vectorial'
import {
  icon,
} from '../../assets'
import {
  AnchorDraw,
  DefaultPathColor,
} from '../../draw'

import type {
  MouseEvent,
  KeyEvent,
  StateMouseEvent,
  StateKeyEvent,
  StateAction,
} from './types'

import {
  setCanvasCursor,
  normalizeMouseEvent,
  isDeadDrag,
} from './utils'

export const enterEditing: StateAction = ({
  indicativeAnchor,
  indicativePath,
  changes,
}) => {
  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])
}

export const enterSelecting: StateAction = ({
  interactionEvent$,
  subscription,
  vectorPath,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => {
        const { anchorHit, pathHit, isClickDown } = normalizeMouseEvent(event, vectorPath)

        return iif(
          () => Boolean(isClickDown),
          iif(
            () => Boolean(anchorHit || pathHit),
            of<StateMouseEvent>({ type: 'select', event }),
            of<StateMouseEvent>({ type: 'marquee', event }),
          ),
          of<StateMouseEvent>({ type: 'move', event, hit: anchorHit ?? pathHit }),
        )
      }),
      tap((event: StateMouseEvent) => { machine?.send(event) }),
    ).subscribe(),
  )
}
