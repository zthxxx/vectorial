import type {
  Interpreter,
  StateMachine,
  Typestate,
} from 'xstate'
import type {
  AreaHitResult,
} from 'vectorial'
import type {
  AnchorHitResult,
  PathHitResult,
} from '@vectorial/whiteboard/nodes'
import type { ToolLayer } from './vector-tool'
import type {
  StateEvent,
} from './machine'

export type {
  AnchorHitResult,
  PathHitResult,
} from '@vectorial/whiteboard/nodes'

export type StateContext = ToolLayer

export type VectorToolMachine = StateMachine<StateContext, any, StateEvent>
export type VectorToolService = Interpreter<StateContext, any, StateEvent, Typestate<StateContext>, any>


/**
 * the direction of vector path for insert new anchor
 */
export enum CreatingDirection {
  Start = 'Start',
  End = 'End',
}

export type HitResult = AnchorHitResult | PathHitResult | AreaHitResult;
