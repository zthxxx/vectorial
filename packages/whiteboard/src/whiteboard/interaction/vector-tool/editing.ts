import {
  of,
  iif,
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
  sub,
  add,
  PathHitType,
  PathHitResult,
  VectorAnchor,
} from 'vectorial'
import {
  AnchorDraw,
} from '../../draw'

import type {
  MouseEvent,
  StateContext,
  StateMouseEvent,
  StateAction,
} from './types'

import {
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
  anchorDraws,
  vectorPath,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => {
        const {
          handlerHit,
          anchorHit,
          pathHit,
          isClickDown,
        } = normalizeMouseEvent(event, vectorPath, anchorDraws)
        const hit: PathHitResult | undefined = handlerHit ?? anchorHit ?? pathHit
        return iif(
          () => Boolean(isClickDown),
          iif(
            () => Boolean(hit),
            of<StateMouseEvent>({ type: 'select', event, hit }),
            of<StateMouseEvent>({ type: 'marquee', event }),
          ),
          of<StateMouseEvent>({ type: 'move', event, hit }),
        )
      }),
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

export const enterDeadZoneChecking: StateAction = (
  context,
  { hit }: StateMouseEvent,
) => {
  const {
    interactionEvent$,
    subscription,
    machine,
  } = context

  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => defer(() => {
        const {
          isDrag,
          isClickUp,
        } = normalizeMouseEvent(event)

        // dragBase will always be existed, code only for defense and type guard
        if (!context.dragBase) {
          return EMPTY
        }

        if (isDrag && !isDeadDrag(context.dragBase, event.mouse)) {
          return of<StateMouseEvent>({ type: 'adjust', event })

        } else if (isClickUp) {
          /**
           * if not hit anchor, that means anchor is new appended to selected;
           * if hit anchor, that means the anchor need be judge to unselect;
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

export const selectingUnselect: StateAction = ({
  changes,
  anchorDraws,
  selected,
}, { event, hit }: StateMouseEvent) => {
  // hit will always be existed, code only for defense and type guard
  if (hit?.type !== PathHitType.Anchor) return

  const isMultiSelect = event.shiftKey

  const anchors: PathHitResult[] = isMultiSelect
    ? selected.filter(({ point }) => point !== hit.point)
    : [hit]

  selected.splice(0, selected.length, ...anchors)

  changes.push(...getResetStyleChanges(anchorDraws))
  changes.push(...getSelectedStyleChanges(selected, anchorDraws))
}

export const getResetStyleChanges = (
  anchorDraws: StateContext['anchorDraws'],
): StateContext['changes'] => {
  const changes: StateContext['changes'] = []
  for (const anchorDraw of anchorDraws.values()) {
    changes.push([anchorDraw, { anchor: 'normal', inHandler: undefined, outHandler: undefined }])
  }
  return changes
}

export const getSelectedStyleChanges = (
  selected: StateContext['selected'],
  anchorDraws: StateContext['anchorDraws'],
): StateContext['changes'] => {
  const selectedSet = new Set<AnchorDraw>()
  const changes: StateContext['changes'] = []

  for (const hit of selected) {
    if (!('ends' in hit)) return []
    const anchorDraw = anchorDraws.get(hit.point)!
    selectedSet.add(anchorDraw)
    changes.push([anchorDraw, {
      anchor: hit.type === PathHitType.Anchor ? 'selected' : 'normal',
      inHandler: hit.type === PathHitType.InHandler ? 'selected' : 'normal',
      outHandler: hit.type === PathHitType.OutHandler ? 'selected' : 'normal',
    }])
  }

  for (const hit of selected) {
    if (!('ends' in hit)) return []
    hit.ends.forEach(anchor => {
      const anchorDraw = anchorDraws.get(anchor)!
      if (selectedSet.has(anchorDraw)) return
      changes.push([anchorDraw, { anchor: 'normal', inHandler: 'normal', outHandler: 'normal' }])
    })
  }

  return changes
}

export const enterAdjusting: StateAction = ({
  interactionEvent$,
  subscription,
  vectorPath,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => defer(() => {
        const { isDrag, isClickUp } = normalizeMouseEvent(event, vectorPath)

        if (isDrag) {
          return of<StateMouseEvent>({ type: 'adjust', event })
        } else if (isClickUp) {
          return of<StateMouseEvent>({ type: 'done', event })
        } else {
          return EMPTY
        }
      })),
      tap((event: StateMouseEvent) => { machine?.send(event) }),
    ).subscribe(),
  )
}

export const adjustingAdjust: StateAction = (context, { event }: StateMouseEvent) => {
  const {
    anchorDraws,
    selected,
    dragBase,
    changes,
  } = context
  if (!selected.length || !dragBase) return

  const hitResult = selected[0]
  const anchor = hitResult.point
  const anchorDraw = anchorDraws.get(anchor)!
  const changeHandlerType = (anchor: VectorAnchor) => {
    if (event.match({ modifiers: ['Alt'] })) {
      anchor.handlerType = HandlerType.Free
    } else if (event.match({ modifiers: ['Meta'] })) {
      anchor.handlerType = HandlerType.Mirror
    }
  }

  switch (hitResult.type) {
    case (PathHitType.Anchor): {
      if (event.metaKey || event.altKey) {
        const hitAnchor = selected.find(({ point }) => (
          point.position.x === dragBase.x
          && point.position.y === dragBase.y
        ))
        if (hitAnchor) {
          changeHandlerType(hitAnchor.point)
          selected.splice(0, selected.length, {
            ...hitAnchor,
            type: PathHitType.OutHandler,
          } as PathHitResult)
        }
        return
      }
      const delta = sub(event.mouse, dragBase)
      selected.forEach(({ point }) => {
        const anchorDraw = anchorDraws.get(point)!
        point.position = add(point.position, delta)
        changes.push([anchorDraw, {}])
      })
      break
    }
    case (PathHitType.InHandler): {
      changeHandlerType(anchor)
      anchor.inHandler = sub(event.mouse, anchor.position)
      changes.push([anchorDraw, {}])
      break
    }
    case (PathHitType.OutHandler): {
      changeHandlerType(anchor)
      anchor.outHandler = sub(event.mouse, anchor.position)
      changes.push([anchorDraw, {}])
      break
    }
  }

  context.dragBase = {
    x: event.mouse.x,
    y: event.mouse.y,
  }
}

export const enterMarqueeing: StateAction = ({
  interactionEvent$,
  subscription,
  vectorPath,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
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
    ).subscribe(),
  )
}
