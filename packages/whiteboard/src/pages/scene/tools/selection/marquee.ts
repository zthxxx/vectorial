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
  SceneNode,
  PageNode,
} from '@vectorial/whiteboard/nodes'
import {
  MouseTriggerType,
  MouseButton,
} from '@vectorial/whiteboard/scene'
import {
  StateAction,
  StateMouseEvent,
  GuardAction,
  MouseEvent,
} from './types'
import {
  normalizeMouseEvent,
} from './utils'

export const enterMarqueeing: GuardAction = (interactEvent$, context) => {
  const {
    scene,
    machine,
  } = context
  const { selected } = scene
  /**
   * use selectCache as selected snapshot while enter Marqueeing
   * commited selected = selected ^ marquee
   */
  context.selectCache = new Set(selected)

  interactEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => defer(() => {
      const {
        isDrag,
        isClickUp,
      } = normalizeMouseEvent(event, scene.page)

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
  const { setMarquee, selectCache } = context
  setMarquee()
  selectCache.clear()
}

/**
 *
 * commited selected = selected ^ marquee
 */
export const marqueeAction: StateAction = (context, { event }: StateMouseEvent) => {
  const {
    scene,
    selectCache,
    setMarquee,
    setSelected,
  } = context
  const selected = new Set(scene.selected)
  const isMultiSelect = event.shiftKey
  if (!event.dragging) {
    setMarquee()
    return
  }

  const { begin, offset } = event.dragging

  const marqueeBounds: Rect = {
    x: offset.x > 0 ? begin.x : begin.x + offset.x,
    y: offset.y > 0 ? begin.y : begin.y + offset.y,
    width: Math.abs(offset.x),
    height: Math.abs(offset.y),
  }

  setMarquee(marqueeBounds)

  const overlaps = findMarquee(
    scene.page,
    marqueeBounds,
  )

  if (!isMultiSelect) {
    selected.clear()
  }

  overlaps.forEach(node => {
    if (isMultiSelect && selectCache.has(node)) {
      selected.delete(node)
      return
    }
    selected.add(node)
  })
  setSelected(selected)
}

export const findMarquee = (
  page: PageNode,
  bounds: Rect,
): SceneNode[] => page.filter(node => node.coverTest(bounds))
