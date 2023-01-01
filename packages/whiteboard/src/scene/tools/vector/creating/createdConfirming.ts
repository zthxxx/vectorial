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
import { match } from 'ts-pattern'
import {
  type AnchorNode,
} from '@vectorial/whiteboard/scene'
import {
  type MouseEvent,
  type StateMouseEvent,
  type StateAction,
  type GuardAction,
  CreatingDirection,
} from '../types'

import {
  normalizeMouseEvent,
} from '../utils'


export const enterDoubleClickConfirming: GuardAction = (interactEvent$, context) => {
  const {
    vectorPath,
    machine,
  } = context

  interactEvent$.pipe(
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
  ).subscribe()
}

export const createDone: StateAction = (context) => {
  const {
    indicativeAnchor,
    indicativePath,
    vectorPath,
    anchorNodes,
    creatingDirection,
    changes,
  } = context
  const { anchors } = vectorPath

  const style: AnchorNode['style'] = {
    anchor: 'normal',
    inHandler: undefined,
    outHandler: undefined
  }

  match(creatingDirection)
    .with(CreatingDirection.Start, () => {
      changes.push(
        [anchorNodes.get(anchors.at(0)!), style],
        [anchorNodes.get(anchors.at(1)!), style],
      )
    })
    .with(CreatingDirection.End, () => {
      changes.push(
        [anchorNodes.get(anchors.at(-1)!), style],
        [anchorNodes.get(anchors.at(-2)!), style],
      )
    })
    .exhaustive()

  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])


  context.creatingDirection = CreatingDirection.End
}
