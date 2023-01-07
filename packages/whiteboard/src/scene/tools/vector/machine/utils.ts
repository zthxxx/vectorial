import {
  Subject,
  Observable,
} from 'rxjs'
import {
  takeUntil,
} from 'rxjs/operators'
import {
  math,
  Vector,
  PathHitType,
  HandlerType,
} from 'vectorial'
import {
  type InteractEvent,
  MouseTriggerType,
  MouseButton,
  AnchorNode,
  type MouseEvent,
} from '@vectorial/whiteboard/scene'
import {
  type BindingVectorPath,
} from '@vectorial/whiteboard/nodes'
import type {
  HitResult,
  AnchorHitResult,
  PathHitResult,
} from '../types'
import {
  type GuardAction,
  type StateAction,
  type StateContext,
} from './types'



export const createInteractGuard = <
  Context extends {
    interactEvent$: Observable<InteractEvent>;
  }
>({ entry, exit }: {
  entry: GuardAction<Context>;
  exit?: StateAction<Context>;
}): {
  entry: StateAction<Context>;
  exit: StateAction<Context>;
} => {
  const rests$ = new Subject<void>()

  return {
    entry: (context, event) => {
      const { interactEvent$ } = context
      const interact$ = interactEvent$.pipe(
        takeUntil(rests$),
      )
      entry(
        context,
        {
          ...event,
          interact$,
        },
      )
    },
    exit: (context, event) => {
      rests$.next()
      exit?.(context, event)
    },
  }
}


export const getHandlerHit = (
  { mouse }: MouseEvent,
  vectorPath?: BindingVectorPath,
  anchorNodes?: StateContext['anchorNodes'],
  padding?: number,
): HitResult | undefined => {
  if (!vectorPath || !anchorNodes) return
  const point = mouse

  const index = vectorPath.anchors.findIndex(anchor => {
    const anchorNode = anchorNodes.get(anchor)
    if (!anchorNode) return false
    return (
      (anchorNode.style?.outHandler && anchor.isOutHandlerNear(point, padding))
      || (anchorNode.style?.inHandler && anchor.isInHandlerNear(point, padding))
    )
  })
  if (index === -1) return

  const { closed } = vectorPath
  const first = vectorPath.anchors.at(0)
  const last = vectorPath.anchors.at(-1)
  const anchor = vectorPath.anchors[index]
  return {
    type: anchor.isOutHandlerNear(point, padding) ? PathHitType.OutHandler : PathHitType.InHandler,
    point: anchor,
    ends: [
      vectorPath.anchors[index - 1] ?? (closed ? last : first),
      vectorPath.anchors[index + 1] ?? (closed ? first : last),
    ],
    anchorIndex: index,
  }
}

export const normalizeMouseEvent = ({
  event,
  vectorPath,
  anchorNodes,
  viewportScale,
}: {
  event: MouseEvent,
  /** vectorPath for path or anchors hit test */
  vectorPath?: BindingVectorPath,
  /** anchorNodes for anchors'handlers hit test */
  anchorNodes?: StateContext['anchorNodes'],
  viewportScale: number,
}): {
  handlerHit?: HitResult;
  anchorHit?: AnchorHitResult;
  pathHit?: PathHitResult;
  isMove: boolean;
  isClickDown: boolean;
  isClickUp: boolean;
  isDrag: boolean;
} => {
  const hitPadding = 8 / viewportScale
  return {
    handlerHit: getHandlerHit(event, vectorPath, anchorNodes, hitPadding),
    anchorHit: vectorPath?.hitAnchorTest(event.mouse, hitPadding),
    pathHit: vectorPath?.hitPathTest(event.mouse, hitPadding),

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
    const anchorNode = anchorNodes.get(hit.point)!
    selectedSet.add(anchorNode)
    changes.push([anchorNode, {
      anchor: hit.type === PathHitType.Anchor ? 'selected' : 'normal',
      inHandler: hit.type === PathHitType.InHandler ? 'selected' : 'normal',
      outHandler: hit.type === PathHitType.OutHandler ? 'selected' : 'normal',
    }])
  }

  for (const hit of selected) {
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
  const direction = math.sub(
    math.add(next.position, next.inHandler ?? math.emptyVector()),
    math.add(prev.position, prev.outHandler ?? math.emptyVector()),
  )
  const length = math.len(math.sub(
    math.add(next.position, next.inHandler ?? math.emptyVector()),
    anchor.position,
  )) * 0.4

  anchor.handlerType = HandlerType.Mirror
  anchor.outHandler = math.scale(direction, length / math.len(direction))
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
  const p2 = math.add(prev.position, prev.outHandler ?? math.emptyVector())
  const p3 = math.add(next.position, next.inHandler ?? math.emptyVector())
  const p4 = next.position

  const quadraticBezierPoint = (p1: Vector, p2: Vector, p3: Vector, t: number) => math.add(
    math.scale(p1, Math.pow(1 - t, 2)),
    math.add(
      math.scale(p2, 2 * t * (1 - t)),
      math.scale(p3, Math.pow(t, 2)),
    ),
  )

  /**
   * point tangent on cubic bezier curve is the same 't' position of quadratic bezier
   */
  const incoming: Vector = quadraticBezierPoint(p1, p2, p3, t)
  const outgoing: Vector = quadraticBezierPoint(p2, p3, p4, t)
  anchor.inHandler = math.sub(incoming, anchor.position)
  anchor.outHandler = math.sub(outgoing, anchor.position)
  anchor.handlerType = HandlerType.Align

  if (prev.outHandler) {
    if (prev.handlerType === HandlerType.Mirror) {
      prev.handlerType = HandlerType.Align
    }
    prev.outHandler = math.scale(prev.outHandler, t)
  }
  if (next.inHandler) {
    if (next.handlerType === HandlerType.Mirror) {
      next.handlerType = HandlerType.Align
    }
    next.inHandler = math.scale(next.inHandler, 1 - t)
  }
}

