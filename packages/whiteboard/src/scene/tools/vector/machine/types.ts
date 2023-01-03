import {
  Observable,
} from 'rxjs'
import {
  type EventObject,
} from 'xstate'
import type {
  HitResult,
} from 'vectorial'
import type {
  InteractEvent,
  MouseEvent,
  KeyEvent,
} from '@vectorial/whiteboard/scene'
import type { ToolLayer } from '../vector-tool'


export type StateContext = ToolLayer

type EventType<T extends string> = { type: T }
export type StateEvent<T extends string = string> = EventType<T> | StateMouseEvent<T> | StateKeyEvent<T>
export type StateMouseEvent<T extends string = string> = EventType<T> & { event: MouseEvent; hit?: HitResult; }
export type StateKeyEvent<T extends string = string> = EventType<T> &  { event: KeyEvent }

export type StateAction<Context extends {}> = ActionFunction<Context, EventObject>
export type GuardEvent = EventObject & { interact$: Observable<InteractEvent> }
export type GuardAction<Context extends {}> = ActionFunction<Context, GuardEvent>


export type ActionFunction<Context, EventObject> = (
  context: Context,
  event: EventObject,
) => void

export type ConditionPredicate<Context, Event = EventObject> = (
  context: Context,
  event: Event,
) => boolean


/**
 * constraint actions with Actions type and context,
 * ensure action names even after bundle/minify
 */
export type StateActions<
  Context extends {},
  EventMap extends { [eventKey: string]: EventObject },
> = {
  [K in keyof EventMap]: ActionFunction<Context, EventMap[K]>
}

export type StateEvents<ActionsMap> = ActionsMap[keyof ActionsMap] | void


/**
 * vector tool initial machine states
 */
export enum VectorRoot {
  Initial = 'Initial',
  Creating = 'Creating',
  Editing = 'Editing',
  Done = 'Done',
}

export const machineName = 'vector-tool'

/**
 * the direction of vector path for insert new anchor
 */
export enum CreatingDirection {
  Start = 'Start',
  End = 'End',
}
