import {
  of,
  iif,
  EMPTY,
} from 'rxjs'
import {
  tap,
  filter,
  mergeMap,
} from 'rxjs/operators'
import type {
  MouseEvent,
  StateMouseEvent,
  StateAction,
} from '../types'

import {
  normalizeMouseEvent,
} from '../utils'


export const enterDoubleClickConfirming: StateAction = ({
  interactionEvent$,
  subscription,
  vectorPath,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => {
        const { anchorHit, isMove, isClickDown } = normalizeMouseEvent(event, vectorPath)

        return iif(
          () => isMove,
          iif(
            () => !anchorHit,
            of<StateMouseEvent>({ type: 'move', event }),
            EMPTY,
          ),
          iif(
            () => isClickDown,
            of<StateMouseEvent>({ type: 'confirm', event }),
            EMPTY,
          )
        )
      }),
      tap((event: StateMouseEvent) => { machine?.send(event) }),
    ).subscribe(),
  )
}

export const createDone: StateAction = (context) => {
  const {
    indicativeAnchor,
    indicativePath,
    vectorPath,
    anchorDraws,
    creatingBase,
    changes,
  } = context
  const { anchors } = vectorPath
  const isReverse = creatingBase !== anchors.at(-1)

  changes.push(
    [
      anchorDraws.get(anchors.at(isReverse ? 0 : -1)!),
      { anchor: 'normal', inHandler: undefined, outHandler: undefined },
    ],
    [
      anchorDraws.get(anchors.at(isReverse ? 1 : -2)!),
      { anchor: 'normal', inHandler: undefined, outHandler: undefined },
    ],
  )

  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])
  context.creatingBase = undefined
}
