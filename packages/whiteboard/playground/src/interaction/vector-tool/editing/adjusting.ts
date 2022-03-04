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
  sub,
  add,
  PathHitType,
  HitResult,
  VectorAnchor,
} from 'vectorial'
import type {
  MouseEvent,
  StateMouseEvent,
  StateAction,
} from '../types'
import {
  normalizeMouseEvent,
} from '../utils'


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
    anchorNodes,
    indicativeAnchor,
    indicativePath,
    selected,
    dragBase,
    changes,
  } = context
  if (!selected.length || !dragBase) return

  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])

  const hitResult = selected[0]
  const anchor = hitResult.point
  const anchorNode = anchorNodes.get(anchor)!
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
          } as HitResult)

        changes.push([anchorNode, { anchor: 'normal', outHandler: 'selected' }])
        }
        return
      }
      const delta = sub(event.mouse, dragBase)
      selected.forEach(({ point }) => {
        const anchorNode = anchorNodes.get(point)!
        point.position = add(point.position, delta)
        changes.push([anchorNode, {}])
      })
      break
    }
    case (PathHitType.InHandler): {
      changeHandlerType(anchor)
      anchor.inHandler = sub(event.mouse, anchor.position)
      changes.push([anchorNode, {}])
      break
    }
    case (PathHitType.OutHandler): {
      changeHandlerType(anchor)
      anchor.outHandler = sub(event.mouse, anchor.position)
      changes.push([anchorNode, {}])
      break
    }
  }

  context.dragBase = {
    x: event.mouse.x,
    y: event.mouse.y,
  }
}
