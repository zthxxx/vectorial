import {
  tap,
  map,
  filter,
} from 'rxjs/operators'
import {
  type EventObject,
} from 'xstate'
import {
  type MouseEvent,
} from '@vectorial/whiteboard/scene'
import {
  createInteractGuard,
  normalizeMouseEvent,
} from '../utils'
import {
  type StateMouseEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
} from '../types'


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

const marqueeingInteract = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      vectorPath,
      machine,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<MarqueeingActions> => {
        const { isDrag, isClickUp } = normalizeMouseEvent(event, vectorPath)

        if (isDrag) {
          return { type: MarqueeingEvent.Marquee, event }
        } else if (isClickUp) {
          return { type: MarqueeingEvent.Done }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()
  },
})

export const marqueeingActions: StateActions<StateContext, MarqueeingActions> = {
  [MarqueeingAction.Entry]: marqueeingInteract.entry,
  [MarqueeingAction.Exit]: marqueeingInteract.exit,

  [MarqueeingAction.Marquee]: (context, { event }) => {
    // @TODO highlight marquee area and select with marquee path anchors
  },
}
