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
import { match } from 'ts-pattern'
import {
  HandlerType,
  PathHitType,
  HitResult,
} from 'vectorial'
import {
  assignMap,
} from '@vectorial/whiteboard/utils'
import {
  type MouseEvent,
  type StateMouseEvent,
  type StateAction,
  type GuardAction,
  CreatingDirection,
} from '../types'
import {
  normalizeMouseEvent,
  getResetStyleChanges,
  getSelectedStyleChanges,
  toggleAnchorHandler,
} from '../utils'


export const enterSelectConfirming: GuardAction = (interactEvent$, context, event) => {
  const {
    machine,
    vectorPath,
  } = context

  const { hit } = event as StateMouseEvent

  interactEvent$.pipe(
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
            'point' in anchorHit
            && (
              anchorHit.point === vectorPath.anchors.at(0)
              || anchorHit.point === vectorPath.anchors.at(-1)
            )
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
  ).subscribe()
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
    vectorPath,
  } = context

  const first = vectorPath.anchors.at(0)!
  const last = vectorPath.anchors.at(0)!

  if (
    hit?.point !== first
    && hit?.point !== last
  ) return

  // when `resumeCreating`, the `hit.point` only can be `first` or `last`
  context.creatingDirection = hit.point === first
    ? CreatingDirection.Start
    : CreatingDirection.End

  selected.splice(0, selected.length, hit)
  changes.push(...getResetStyleChanges(anchorNodes))
  changes.push(...getSelectedStyleChanges(selected, anchorNodes))
}

export const confirmingToggleHandler: StateAction = ({
  scene,
  vectorNode,
  changes,
  anchorNodes,
  selected,
}, { hit }: StateMouseEvent) => {
  const hitResult = match(hit)
    .with({ type: PathHitType.Anchor }, (hit) => {
      const anchor = hit.point
      if (anchor.inHandler && anchor.outHandler) {
        anchor.handlerType = HandlerType.None
      } else (
        toggleAnchorHandler(hit as HitResult & { type: PathHitType.Anchor })
      )
      selected.splice(0, selected.length, hit)
      return hit
    })

    .with({ type: PathHitType.InHandler }, (hit) => {
      hit.point.inHandler = undefined
      selected.splice(0, selected.length, {
        ...hit,
        type: PathHitType.Anchor,
      })
      return hit
    })

    .with({ type: PathHitType.OutHandler }, (hit) => {
      hit.point.outHandler = undefined
      selected.splice(0, selected.length, {
        ...hit,
        type: PathHitType.Anchor,
      })
      return hit
    })

    .otherwise(() => undefined)

  if (!hitResult) return

  const anchors = vectorNode.binding.get('path')!.get('anchors')!

  const { point, anchorIndex } = hitResult
  scene.docTransact(() => {
    assignMap(anchors.get(anchorIndex), {
      inHandler: point.inHandler,
      outHandler: point.outHandler,
      handlerType: point.handlerType,
    })
  })

  changes.push(...getResetStyleChanges(anchorNodes))
  changes.push(...getSelectedStyleChanges(selected, anchorNodes))
}

