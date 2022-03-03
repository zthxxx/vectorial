import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import type {
  Observable,
} from 'rxjs'
import type {
  Interpreter,
  StateMachine,
  EventObject,
  ActionFunction,
} from 'xstate'
import {
  PathNode,
} from '../../nodes'
import type { LayerManager } from '../layer'
import type {
  InteractionEvent,
  MouseEvent,
  KeyEvent,
} from '../event'

export type {
  MouseEvent,
  KeyEvent,
}
export type StateMouseEvent = EventObject & { event: MouseEvent; hit?: PathNode; }
export type StateKeyEvent = EventObject & { event: KeyEvent }

export type StateEvent = EventObject | StateMouseEvent | StateKeyEvent

export interface StateContext {
  interactionEvent$: Observable<InteractionEvent>;
  machine?: SelectToolService;
  layerManager: LayerManager;
  marqueeLayer: Graphics;
  boundaryLayer: Graphics;
  selectLayer: Container;
  /**
   * cached selected, not commit to layerManager yet
   * used in marquee selection
   */
  selectCache: Set<PathNode>;
  /**
   * for hover style
   */
  hoverNode?: PathNode
}

export type StateAction = ActionFunction<StateContext, StateEvent>
export type GuardAction = (interactionEvent$: Observable<InteractionEvent>, context: StateContext) => void

export type SelectToolMachine = StateMachine<StateContext, any, StateEvent>
export type SelectToolService = Interpreter<StateContext, any, StateEvent>
