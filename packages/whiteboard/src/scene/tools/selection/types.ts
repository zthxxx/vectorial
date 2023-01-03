import type {
  Interpreter,
  StateMachine,
  Typestate,
} from 'xstate'

import type { SelectTool } from './select-tool'
import type {
  StateEvent,
} from './machine'

export type StateContext = SelectTool

export type SelectToolMachine = StateMachine<StateContext, any, StateEvent>
export type SelectToolService = Interpreter<StateContext, any, StateEvent, Typestate<StateContext>, any>
