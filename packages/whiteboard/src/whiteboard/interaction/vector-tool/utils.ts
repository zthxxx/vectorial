
import {
  sub,
  len,
  Vector,
  VectorPath,
  PathHitType,
  PathHitResult,
} from 'vectorial'
import {
  MouseTriggerType,
  MouseButton,
} from '../event'
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
