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


export const enterDoubleClickConfirming: StateAction = (context) => {
  const {
    interactionEvent$,
    subscription,
    vectorPath,
    machine,
  } = context

  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => {
        const { anchorHit, isMove, isClickDown } = normalizeMouseEvent(event, vectorPath)

        return iif(
          () => (
            isClickDown
            && event.isDoubleClick
          ),
          of<StateMouseEvent>({ type: 'confirm', event }),
          iif(
            () => isMove && !anchorHit,
            of<StateMouseEvent>({ type: 'move', event }),
            EMPTY,
          ),
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
    anchorNodes,
    creatingBase,
    changes,
  } = context
  const { anchors } = vectorPath
  const isReverse = creatingBase !== anchors.at(-1)

  changes.push(
    [
      anchorNodes.get(anchors.at(isReverse ? 0 : -1)!),
      { anchor: 'normal', inHandler: undefined, outHandler: undefined },
    ],
    [
      anchorNodes.get(anchors.at(isReverse ? 1 : -2)!),
      { anchor: 'normal', inHandler: undefined, outHandler: undefined },
    ],
  )

  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])
  context.creatingBase = undefined
}
