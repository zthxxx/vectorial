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
  GuardAction,
} from '../types'
import {
  normalizeMouseEvent,
} from '../utils'


export const enterMarqueeing: GuardAction = (interactEvent$, context) => {
  const {
    vectorPath,
    machine,
  } = context

  interactEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => {
      const {
        isDrag,
        isClickUp
      } = normalizeMouseEvent(event, vectorPath)

      return iif(
        () => isDrag,
        of<StateMouseEvent>({ type: 'marquee', event }),
        iif(
          () => isClickUp,
          of<StateMouseEvent>({ type: 'marqueeDone', event }),
          EMPTY,
        ),
      )
    }),
    tap((event: StateMouseEvent) => { machine?.send(event) }),
  ).subscribe()
}
