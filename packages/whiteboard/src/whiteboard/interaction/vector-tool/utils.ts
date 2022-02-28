
import {
  add,
  sub,
  len,
  scale,
  empty,
  Vector,
  VectorPath,
  PathHitType,
  PathHitResult,
  HandlerType,
} from 'vectorial'
import {
  MouseTriggerType,
  MouseButton,
} from '../event'
import {
  AnchorDraw,
} from '../../draw'
import type {
  MouseEvent,
  StateContext,
  StateAction,
} from './types'


export const setCanvasCursor = (canvas: HTMLCanvasElement, icon?: string): void => {
  canvas.parentElement!.style.cursor = icon ? `url('${icon}'), auto` : 'default'
}

export const unsubscribeAll: StateAction = ({ subscription }) => {
  while(subscription.length) subscription.pop()!.unsubscribe()
}

export const getHandlerHit = (
  { mouse }: MouseEvent,
  vectorPath?: VectorPath,
  anchorDraws?: StateContext['anchorDraws'],
): PathHitResult | undefined => {
  if (!vectorPath || !anchorDraws) return
  const index = vectorPath.anchors.findIndex(anchor => {
    const anchorDraw = anchorDraws.get(anchor)!
    return (
      (anchorDraw.style?.outHandler && anchor.isOutHandlerNear(mouse))
      || (anchorDraw.style?.inHandler && anchor.isInHandlerNear(mouse))
    )
  })
  if (index === -1) return

  const { closed } = vectorPath
  const first = vectorPath.anchors.at(0)
  const last = vectorPath.anchors.at(-1)
  const anchor = vectorPath.anchors[index]
  return {
    type: anchor.isOutHandlerNear(mouse) ? PathHitType.OutHandler : PathHitType.InHandler,
    point: anchor,
    ends: [
      vectorPath.anchors[index - 1] ?? (closed ? last : first),
      vectorPath.anchors[index + 1] ?? (closed ? first : last),
    ],
  }
}

export const normalizeMouseEvent = (
  event: MouseEvent,
  /** vectorPath for path or anchors hit test */
  vectorPath?: VectorPath,
  /** anchorDraws for anchors'handlers hit test */
  anchorDraws?: StateContext['anchorDraws'],
): {
  handlerHit?: PathHitResult;
  anchorHit?: PathHitResult;
  pathHit?: PathHitResult;
  isMove: boolean;
  isClickDown: boolean;
  isClickUp: boolean;
  isDrag: boolean;
} => ({
  handlerHit: getHandlerHit(event, vectorPath, anchorDraws),
  anchorHit: vectorPath?.hitAnchorTest(event.mouse),
  pathHit: vectorPath?.hitPathTest(event.mouse),

  isMove: event.mouse.type == MouseTriggerType.Move,
  isClickDown: (
    event.mouse.type === MouseTriggerType.Down
    && event.match({ mouse: [MouseButton.Left] })
  ),
  isDrag: (
    event.mouse.type === MouseTriggerType.Move
    && event.match({ mouse: [MouseButton.Left] })
  ),
  isClickUp: (
    event.mouse.type === MouseTriggerType.Up
    && !event.downMouse.size
  ),
})

export const isDeadDrag = (prev: Vector, next: Vector): boolean =>
  len(sub(prev, next)) < 8


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


/**
 * @TODO: need a more precise algorithm
 */
export const toggleAnchorHandler = (anchorHit: PathHitResult & { type: PathHitType.Anchor }) => {
  const anchor = anchorHit.point
  const [prev, next] = anchorHit.ends
  const direction = sub(
    add(next.position, next.inHandler ?? empty()),
    add(prev.position, prev.outHandler ?? empty()),
  )
  const length = len(sub(
    add(next.position, next.inHandler ?? empty()),
    anchor.position,
  )) * 0.4

  anchor.handlerType = HandlerType.Mirror
  anchor.outHandler = scale(direction, length / len(direction))
}

export const setAnchorHandlerOnPath = (
  pathHit: PathHitResult & { type: PathHitType.Stroke },
) => {
  const {
    point: anchor,
    ends: [prev, next],
    t,
  } = pathHit

  anchor.handlerType = HandlerType.Free

  const p1 = prev.position
  const p2 = add(prev.position, prev.outHandler ?? empty())
  const p3 = add(next.position, next.inHandler ?? empty())
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

