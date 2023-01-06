import {
  tap,
  map,
  filter,
} from 'rxjs/operators'
import {
  type EventObject,
} from 'xstate'
import { Rect } from 'vectorial'
import {
  type MouseEvent,
} from '@vectorial/whiteboard/scene'
import {
  createInteractGuard,
  normalizeMouseEvent,
  findMarqueeCover,
} from './utils'
import {
  type StateMouseEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
} from './types'


export enum MarqueeingEvent {
  Marquee = 'Marquee',
  Done = 'Done',
}

export enum MarqueeingAction {
  Entry = 'Marqueeing.Entry',
  Exit = 'Marqueeing.Exit',
  Marquee = 'Marqueeing.Marquee',
  Done = 'Marqueeing.Done',
}

export type MarqueeingActions = {
  [MarqueeingAction.Entry]: EventObject;
  [MarqueeingAction.Exit]: EventObject;
  [MarqueeingAction.Marquee]: StateMouseEvent<MarqueeingEvent.Marquee>;
}

const marqueeingInteractGuard = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      scene,
      machine,
    } = context

    const { selected } = scene
    /**
     * use selectCache as selected snapshot while enter Marqueeing
     * committed selected = selected ^ marquee
     */
    context.selectCache = new Set(selected)


    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<MarqueeingActions> => {
        const {
          isDrag,
          isClickUp,
        } = normalizeMouseEvent(event, scene.page, scene.selected, scene.scale)

        if (isDrag) {
          return { type: MarqueeingEvent.Marquee, event }
        } else if (isClickUp) {
          return { type: MarqueeingEvent.Done }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()
  },

  exit: (context) => {
    const { setMarquee, selectCache } = context
    setMarquee()
    selectCache.clear()
  },
})

export const marqueeingActions: StateActions<StateContext, MarqueeingActions> = {
  [MarqueeingAction.Entry]: marqueeingInteractGuard.entry,
  [MarqueeingAction.Exit]: marqueeingInteractGuard.exit,

  [MarqueeingAction.Marquee]: (context, { event }) => {
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

    const overlaps = findMarqueeCover(
      scene.page,
      scene.selected,
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
  },
}
