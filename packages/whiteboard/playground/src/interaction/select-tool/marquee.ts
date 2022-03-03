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
import { Graphics } from '@pixi/graphics'
import { Rectangle } from '@pixi/math'
import {  Rect } from 'vectorial'
import {
  PathNode,
  PathStyle,
  DefaultPathColor,
} from '../../nodes'
import type { LayerManager } from '../layer'
import {
  InteractionEvent,
} from '../event'
import {
  StateAction,
  StateMouseEvent,
  GuardAction,
  MouseEvent,
} from './types'
import {
  normalizeMouseEvent,
} from './utils'

export const enterMarqueeing: GuardAction = (interactionEvent$, context) => {
  const {
    layerManager,
    machine,
  } = context
  const { selected } = layerManager
  /**
   * use selectCache as selected snapshot while enter Marqueeing
   * commited selected = selected ^ marquee
   */
  context.selectCache = new Set(selected)

  interactionEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => defer(() => {
      const {
        isDrag,
        isClickUp,
      } = normalizeMouseEvent(event, layerManager)

      if (isDrag) {
        return of<StateMouseEvent>({ type: 'marquee', event })
      } else if (isClickUp) {
        return of<StateMouseEvent>({ type: 'marqueeDone', event })
      } else {
        return EMPTY
      }
    })),
    tap((event: StateMouseEvent) => { machine?.send(event) }),
  ).subscribe()
}

export const exitMarqueeing: StateAction = (context) => {
  const { marqueeLayer, selectCache } = context
  marqueeLayer.clear()
  selectCache.clear()
}

export const marqueeStyle: PathStyle = {
  strokeColor: DefaultPathColor.highlight,
  strokeWidth: 1,
  fillColor: DefaultPathColor.highlight,
  fillAlpha: 0.2,
}

/**
 *
 * commited selected = selected ^ marquee
 */
export const marqueeAction: StateAction = (context, { event }: StateMouseEvent) => {
  const {
    layerManager,
    selectCache,
    marqueeLayer,
  } = context
  const { selected } = layerManager
  const isMultiSelect = event.shiftKey
  drawMarquee(marqueeLayer, event.dragging)

  if (!event.dragging) return

  const { begin, offset } = event.dragging

  const marqueeBounds: Rect = {
    x: offset.x > 0 ? begin.x : begin.x + offset.x,
    y: offset.y > 0 ? begin.y : begin.y + offset.y,
    width: Math.abs(offset.x),
    height: Math.abs(offset.y),
  }

  const overlaps = findMarquee(
    layerManager,
    marqueeBounds,
  )

  if (!isMultiSelect) {
    layerManager.selected.clear()
  }

  overlaps.forEach(node => {
    if (isMultiSelect && selectCache.has(node)) {
      selected.delete(node)
      return
    }
    selected.add(node)
  })

}

export const findMarquee = (
  layerManager: LayerManager,
  bounds: Rect,
): PathNode[] => layerManager.filter(node => {
  const nodeBounds = node.path.bounds
  return (
    Math.min(bounds.x + bounds.width, nodeBounds.x + nodeBounds.width) > Math.max(bounds.x, nodeBounds.x)
    && Math.min(bounds.y + bounds.height, nodeBounds.y + nodeBounds.height) > Math.max(bounds.y, nodeBounds.y)
  )
})


export const drawMarquee = (
  marqueeLayer: Graphics,
  dragging: InteractionEvent['dragging'],
) => {
  marqueeLayer.clear()
  if (!dragging) return
  const { begin, offset } = dragging
  marqueeLayer
    .beginFill(marqueeStyle.fillColor, marqueeStyle.fillAlpha)
    .lineStyle({
      width: marqueeStyle.strokeWidth,
      color: marqueeStyle.strokeColor,
    })
    .drawShape(new Rectangle(
      begin.x,
      begin.y,
      offset.x,
      offset.y,
    ))
    .endFill()
}
