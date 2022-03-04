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
  HandlerType,
  PathHitType,
  HitResult,
} from 'vectorial'

import type {
  MouseEvent,
  StateMouseEvent,
  StateAction,
} from '../types'
import {
  normalizeMouseEvent,
  getResetStyleChanges,
  getSelectedStyleChanges,
  toggleAnchorHandler,
} from '../utils'


export const enterSelectConfirming: StateAction = (
  context,
  { hit }: StateMouseEvent,
) => {
  const {
    interactionEvent$,
    subscription,
    machine,
    vectorPath,
  } = context
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => defer(() => {
        const {
          isDrag,
          isClickUp,
          anchorHit,
        } = normalizeMouseEvent(event, vectorPath)

        // dragBase will always be existed, code only for defense and type guard
        if (!context.dragBase) {
          return EMPTY
        }

        if (isDrag) {
          return of<StateMouseEvent>({ type: 'adjust', event })

        } else if (isClickUp) {
          if (
            event.match({ modifiers: ['Meta'] })
            && [
              PathHitType.Anchor,
              PathHitType.InHandler,
              PathHitType.OutHandler,
            ].includes(hit?.type as PathHitType)
          ) {
            return of<StateMouseEvent>({ type: 'toggleHandler', event, hit })
          }

          if (
            !vectorPath.closed
            && !event.shiftKey
            && anchorHit
            && (
              anchorHit.point === vectorPath.anchors.at(0)
              || anchorHit.point === vectorPath.anchors.at(-1)
            )
          ) {
            return of<StateMouseEvent>({ type: 'resumeCreating', event, hit: anchorHit })
          }
          /**
           * if not hit anchor, that means anchor is new appended to selected;
           * if hit an anchor, that means the anchor need be judge to unselect;
           */
          if (hit?.type === PathHitType.Anchor) {
            return of<StateMouseEvent>({ type: 'unselect', event, hit })
          }
          return of<StateMouseEvent>({ type: 'cancel', event })

        } else {
          return EMPTY
        }

      })),
      tap((event: StateMouseEvent) => { machine?.send(event) }),
    ).subscribe(),
  )
}

export const confirmingUnselect: StateAction = ({
  changes,
  anchorNodes,
  selected,
}, { event, hit }: StateMouseEvent) => {
  // hit will always be existed, code only for defense and type guard
  if (hit?.type !== PathHitType.Anchor) return

  const isMultiSelect = event.shiftKey

  const anchors: HitResult[] = isMultiSelect
    ? selected.filter(({ point }) => point !== hit.point)
    : [hit]

  selected.splice(0, selected.length, ...anchors)

  changes.push(...getResetStyleChanges(anchorNodes))
  changes.push(...getSelectedStyleChanges(selected, anchorNodes))
}

export const selectingResumeCreating: StateAction = (
  context,
  { hit }: StateMouseEvent,
) => {
  const {
    anchorNodes,
    selected,
    changes,
  } = context

  if (hit?.type !== PathHitType.Anchor) return
  context.creatingBase = hit.point
  selected.splice(0, selected.length, hit)
  changes.push(...getResetStyleChanges(anchorNodes))
  changes.push(...getSelectedStyleChanges(selected, anchorNodes))
}

export const confirmingToggleHander: StateAction = ({
  changes,
  anchorNodes,
  selected,
}, { hit }: StateMouseEvent) => {
  // hit will always be existed, code only for defense and type guard
  if (!hit) return

  switch (hit.type) {
    case (PathHitType.Anchor): {
      const anchor = hit.point
      if (anchor.inHandler && anchor.outHandler) {
        anchor.handlerType = HandlerType.None
      } else (
        toggleAnchorHandler(hit as HitResult & { type: PathHitType.Anchor })
      )
      selected.splice(0, selected.length, hit)
      break
    }
    case (PathHitType.InHandler): {
      hit.point.inHandler = undefined
      selected.splice(0, selected.length, {
        ...hit,
        type: PathHitType.Anchor,
      })
      break
    }
    case (PathHitType.OutHandler): {
      hit.point.outHandler = undefined
      selected.splice(0, selected.length, {
        ...hit,
        type: PathHitType.Anchor,
      })
      break
    }
  }

  changes.push(...getResetStyleChanges(anchorNodes))
  changes.push(...getSelectedStyleChanges(selected, anchorNodes))
}

