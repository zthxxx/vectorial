import {
  Observable,
} from 'rxjs'
import {
  type EventObject,
} from 'xstate'
import type {
  InteractEvent,
  MouseEvent,
  KeyEvent,
} from '@vectorial/whiteboard/scene'
import type {
  SceneNode,
} from '@vectorial/whiteboard/nodes'
import type { SelectTool } from '../select-tool'


export type StateContext = SelectTool

type EventType<T extends string> = { type: T }
export type StateEvent<T extends string = string> = EventType<T> | StateMouseEvent<T> | StateKeyEvent<T>
export type StateMouseEvent<T extends string = string> = EventType<T> & { event: MouseEvent; hit?: SceneNode; }
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
 * selection machine states
 */
export enum Selection {
  Selecting = 'Selecting',
  /** temp transition state, for wait dead-zone */
  SelectConfirming = 'SelectConfirming',
  MovingNode = 'MovingNode',
  Marqueeing = 'Marqueeing',
  /** finally state, will jump to edit mode */
  EditVector = 'EditVector',
}
