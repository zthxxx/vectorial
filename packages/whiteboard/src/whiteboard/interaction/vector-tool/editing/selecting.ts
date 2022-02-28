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
  add,
  PathHitType,
  PathHitResult,
} from 'vectorial'
import {
  AnchorDraw,
} from '../../../draw'
import type {
  MouseEvent,
  StateMouseEvent,
  StateAction,
} from '../types'
import {
  normalizeMouseEvent,
  getResetStyleChanges,
  getSelectedStyleChanges,
  setAnchorHandlerOnPath,
} from '../utils'


export const enterSelecting: StateAction = ({
  interactionEvent$,
  subscription,
  anchorDraws,
  vectorPath,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => defer(() => {
        const {
          handlerHit,
          anchorHit,
          pathHit,
          isClickDown,
        } = normalizeMouseEvent(event, vectorPath, anchorDraws)

        const hit: PathHitResult | undefined = handlerHit ?? anchorHit ?? pathHit

        if (isClickDown) {
          if (!hit) {
            return of<StateMouseEvent>({ type: 'marquee', event })
          } else if (anchorHit ?? handlerHit) {
            return of<StateMouseEvent>({ type: 'select', event, hit: anchorHit ?? handlerHit })
          } else if (pathHit) {
            return of<StateMouseEvent>({ type: 'insertAnchor', event, hit: pathHit })
          } else {
            return EMPTY
          }
        } else {
          return of<StateMouseEvent>({ type: 'move', event, hit })
        }
      })),
      tap((event: StateMouseEvent) => { machine?.send(event) }),
    ).subscribe(),
  )
}

export const selectingSelect: StateAction = (context, stateEvent: StateMouseEvent) => {
  const {
    indicativeAnchor,
    changes,
    anchorDraws,
    selected,
  } = context
  const { event, hit } = stateEvent
  const isMultiSelect = event.shiftKey

  const resetStyles = () => {
    changes.push(...getResetStyleChanges(anchorDraws))
  }

  if (!hit) {
    if (!isMultiSelect) resetStyles()
    return
  }

  changes.push([indicativeAnchor, undefined])

  switch (hit.type) {
    case (PathHitType.Anchor): {
      let anchors: PathHitResult[] = []
      const isSelected = anchorDraws.get(hit.point)!.style?.anchor === 'selected'
      context.dragBase = { ...hit.point.position }

      if (isSelected) {
        return
      }
      /**
       * for selectConfirming,
       * if not hit anchor, that means anchor is new appended to selected;
       * if hit an anchor, that means the anchor need be judge to unselect;
       */
      stateEvent.hit = undefined

      if (isMultiSelect) {
        anchors = selected.filter(({ type }) => type === PathHitType.Anchor)
        anchors.push(hit)
      } else {
        anchors = [hit]
      }

      selected.splice(0, selected.length, ...anchors)
      break
    }

    case (PathHitType.InHandler): {
      context.dragBase = add(hit.point.position, hit.point.inHandler!)
      selected.splice(0, selected.length, hit)
      break
    }
    case (PathHitType.OutHandler): {
      context.dragBase = add(hit.point.position, hit.point.outHandler!)
      selected.splice(0, selected.length, hit)
      break
    }
  }

  resetStyles()

  changes.push(...getSelectedStyleChanges(selected, anchorDraws))
}

export const selectingInsertAnchor: StateAction = (context, { hit }: StateMouseEvent) => {
  const {
    anchorDraws,
    vectorPath,
    selected,
    changes,
  } = context

  if (hit?.type !== PathHitType.Stroke) return

  vectorPath.addAnchorAt(hit.point, hit.curveIndex + 1)
  const anchorDraw = new AnchorDraw({ vectorAnchor: hit.point })
  anchorDraws.set(hit.point, anchorDraw)

  setAnchorHandlerOnPath(hit)
  context.dragBase = { ...hit.point.position }

  selected.splice(0, selected.length, {
    ...hit,
    type: PathHitType.Anchor,
  })
  changes.push(...getResetStyleChanges(anchorDraws))
  changes.push(...getSelectedStyleChanges(selected, anchorDraws))
}
