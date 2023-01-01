import type {
  Observable,
} from 'rxjs'
import type {
  Interpreter,
  StateMachine,
  EventObject,
  ActionFunction,
} from 'xstate'
import type {
  InteractEvent,
  MouseEvent,
  KeyEvent,
} from '@vectorial/whiteboard/scene'
import {
  SceneNode,
} from '@vectorial/whiteboard/nodes'
import type { SelectTool } from './select-tool'

export type {
  MouseEvent,
  KeyEvent,
}
export type StateMouseEvent = EventObject & { event: MouseEvent; hit?: SceneNode; }
export type StateKeyEvent = EventObject & { event: KeyEvent }

export type StateEvent = EventObject | StateMouseEvent | StateKeyEvent

export type StateContext = SelectTool

export type StateAction = ActionFunction<StateContext, StateEvent>
export type GuardAction = (interactEvent$: Observable<InteractEvent>, context: StateContext, ev: StateEvent) => void

export type SelectToolMachine = StateMachine<StateContext, any, StateEvent>
export type SelectToolService = Interpreter<StateContext, any, StateEvent>
