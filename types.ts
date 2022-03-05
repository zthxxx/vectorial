import type {
  Observable,
  Subscription,
} from 'rxjs'
import type {
  Interpreter,
  StateMachine,
  EventObject,
  ActionFunction,
} from 'xstate'
import type {
  VectorPath,
  VectorAnchor,
  Vector,
  HitResult,
} from 'vectorial'
import {
  InteractEvent,
  MouseEvent,
  KeyEvent,
  Scene,
} from '@vectorial/whiteboard/scene'
import {
  SceneNode,
  VectorNode,
} from '@vectorial/whiteboard/nodes'
import type {
  AnchorNode,
} from './anchor'
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
