import {
  Subject,
} from 'rxjs'
import {
  takeUntil,
} from 'rxjs/operators'
import {
  add,
  sub,
  len,
  scale,
  emptyVector,
  Vector,
  VectorPath,
  PathHitType,
  HitResult,
  HandlerType,
  applyInverse,
  PathHitResult,
  Matrix,
} from 'vectorial'
import {
  MouseTriggerType,
  MouseButton,
  InteractEvent,
} from '@vectorial/whiteboard/scene'
import {
  AnchorNode,
} from '@vectorial/whiteboard/scene/plugins'
import type {
  MouseEvent,
  StateContext,
  StateAction,
  GuardAction,
} from './types'


export const applyToLocalEvent = (
  interactEvent: InteractEvent,
  transform: Matrix,
): InteractEvent => {
  const event = interactEvent.clone()
  event.key = interactEvent.key
  if (event.lastMouse) {
    event.lastMouse = applyInverse(event.lastMouse, transform)
  }
  if (
    interactEvent.mouse
    && interactEvent.mouse.type !== MouseTriggerType.Wheel
  ) {
    event.mouse = { ...interactEvent.mouse }
    const pos = applyInverse(event.mouse, transform)
    event.mouse.x = pos.x
    event.mouse.y = pos.y
  }

  if (event.dragging) {
    const { begin, offset } = event.dragging
    const start = applyInverse(begin, transform)
    const end = applyInverse(add(begin, offset), transform)
    const delta = sub(end, event.lastMouse!)
    event.dragging = {
      begin: start,
      offset: end,
      delta,
    }
  }

  return event
}

export const createEventGuard = (entry: GuardAction, exit?: StateAction): {
  entry: StateAction;
  exit: StateAction;
} => {
  const rests$ = new Subject<void>()

  return {
    entry: (context, ev) => {
      const { interactEvent$ } = context
      const event$ = interactEvent$.pipe(
        takeUntil(rests$),
      )
      entry(
        event$,
        context,
        ev,
      )
    },
    exit: (context, event, action) => {
      rests$.next()
      exit?.(context, event, action)
    },
  }
}


export const getHandlerHit = (
  { mouse }: MouseEvent,
  vectorPath?: VectorPath,
  anchorNodes?: StateContext['anchorNodes'],
): HitResult | undefined => {
  if (!vectorPath || !anchorNodes) return
  const point = mouse

  const index = vectorPath.anchors.findIndex(anchor => {
    const anchorNode = anchorNodes.get(anchor)!
    return (
      (anchorNode.style?.outHandler && anchor.isOutHandlerNear(point))
      || (anchorNode.style?.inHandler && anchor.isInHandlerNear(point))
    )
  })
  if (index === -1) return

  const { closed } = vectorPath
  const first = vectorPath.anchors.at(0)
  const last = vectorPath.anchors.at(-1)
  const anchor = vectorPath.anchors[index]
  return {
    type: anchor.isOutHandlerNear(point) ? PathHitType.OutHandler : PathHitType.InHandler,
    point: anchor,
    ends: [
      vectorPath.anchors[index - 1] ?? (closed ? last : first),
      vectorPath.anchors[index + 1] ?? (closed ? first : last),
    ],
    anchorIndex: index,
  }
}

export const normalizeMouseEvent = (
  event: MouseEvent,
  /** vectorPath for path or anchors hit test */
  vectorPath?: VectorPath,
  /** anchorNodes for anchors'handlers hit test */
  anchorNodes?: StateContext['anchorNodes'],
): {
  handlerHit?: HitResult;
  anchorHit?: HitResult;
  pathHit?: HitResult;
  isMove: boolean;
  isClickDown: boolean;
  isClickUp: boolean;
  isDrag: boolean;
} => {
  return {
    handlerHit: getHandlerHit(event, vectorPath, anchorNodes),
    anchorHit: vectorPath?.hitAnchorTest(event.mouse),
    pathHit: vectorPath?.hitPathTest(event.mouse),

    isMove: event.mouse.type == MouseTriggerType.Move,
    isClickDown: (
      event.mouse.type === MouseTriggerType.Down
      && event.match({ mouse: [MouseButton.Left] })
    ),
    isDrag: (
      Boolean(event.dragging)
      && event.match({ mouse: [MouseButton.Left] })
    ),
    isClickUp: (
      event.mouse.type === MouseTriggerType.Up
      && !event.downMouse.size
    ),
  }
}


export const getResetStyleChanges = (
  anchorNodes: StateContext['anchorNodes'],
): StateContext['changes'] => {
  const changes: StateContext['changes'] = []
  for (const anchorNode of anchorNodes.values()) {
    changes.push([anchorNode, { anchor: 'normal', inHandler: undefined, outHandler: undefined }])
  }
  return changes
}

export const getSelectedStyleChanges = (
  selected: StateContext['selected'],
  anchorNodes: StateContext['anchorNodes'],
): StateContext['changes'] => {
  const selectedSet = new Set<AnchorNode>()
  const changes: StateContext['changes'] = []

  for (const hit of selected) {
    if (!('ends' in hit)) return []
    const anchorNode = anchorNodes.get(hit.point)!
    selectedSet.add(anchorNode)
    changes.push([anchorNode, {
      anchor: hit.type === PathHitType.Anchor ? 'selected' : 'normal',
      inHandler: hit.type === PathHitType.InHandler ? 'selected' : 'normal',
      outHandler: hit.type === PathHitType.OutHandler ? 'selected' : 'normal',
    }])
  }

  for (const hit of selected) {
    if (!('ends' in hit)) return []
    hit.ends.forEach(anchor => {
      const anchorNode = anchorNodes.get(anchor)!
      if (selectedSet.has(anchorNode)) return
      changes.push([anchorNode, { anchor: 'normal', inHandler: 'normal', outHandler: 'normal' }])
    })
  }

  return changes
}


/**
 * @TODO: need a more precise algorithm
 */
export const toggleAnchorHandler = (anchorHit: HitResult & { type: PathHitType.Anchor }) => {
  const anchor = anchorHit.point
  const [prev, next] = anchorHit.ends
  const direction = sub(
    add(next.position, next.inHandler ?? emptyVector()),
    add(prev.position, prev.outHandler ?? emptyVector()),
  )
  const length = len(sub(
    add(next.position, next.inHandler ?? emptyVector()),
    anchor.position,
  )) * 0.4

  anchor.handlerType = HandlerType.Mirror
  anchor.outHandler = scale(direction, length / len(direction))
}

export const setAnchorHandlerOnPath = (
  pathHit: PathHitResult,
) => {
  const {
    point: anchor,
    ends: [prev, next],
    t,
  } = pathHit

  anchor.handlerType = HandlerType.Free

  const p1 = prev.position
  const p2 = add(prev.position, prev.outHandler ?? emptyVector())
  const p3 = add(next.position, next.inHandler ?? emptyVector())
  const p4 = next.position

  const quadraticBezierPoint = (p1: Vector, p2: Vector, p3: Vector, t: number) => add(
    scale(p1, Math.pow(1 - t, 2)),
    add(
      scale(p2, 2 * t * (1 - t)),
      scale(p3, Math.pow(t, 2)),
    ),
  )

  /**
   * point tangent on cubic bezier curve is the same 't' position of quadratic bezier
   */
  const incoming: Vector = quadraticBezierPoint(p1, p2, p3, t)
  const outgoing: Vector = quadraticBezierPoint(p2, p3, p4, t)
  anchor.inHandler = sub(incoming, anchor.position)
  anchor.outHandler = sub(outgoing, anchor.position)
  anchor.handlerType = HandlerType.Align

  if (prev.outHandler) {
    if (prev.handlerType === HandlerType.Mirror) {
      prev.handlerType = HandlerType.Align
    }
    prev.outHandler = scale(prev.outHandler, t)
  }
  if (next.inHandler) {
    if (next.handlerType === HandlerType.Mirror) {
      next.handlerType = HandlerType.Align
    }
    next.inHandler = scale(next.inHandler, 1 - t)
  }
}

