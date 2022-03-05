import type {
  Observable,
} from 'rxjs'
import type {
  HitResult,
} from 'vectorial'
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
import type { ToolLayer } from './vector-tool'

export type {
  MouseEvent,
  KeyEvent,
}
export type StateMouseEvent = EventObject & { event: MouseEvent; hit?: HitResult; }
export type StateKeyEvent = EventObject & { event: KeyEvent }

export type StateEvent = EventObject | StateMouseEvent | StateKeyEvent

export type StateContext = ToolLayer

export type StateAction = ActionFunction<StateContext, StateEvent>
export type GuardAction = (interactEvent$: Observable<InteractEvent>, context: StateContext, ev: StateEvent) => void

export type VectorToolMachine = StateMachine<StateContext, any, StateEvent>
export type VectorToolService = Interpreter<StateContext, any, StateEvent>
