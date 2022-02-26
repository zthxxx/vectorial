import type {
  Subject,
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
  PathHitResult,
} from 'vectorial'
import type {
  AnchorDraw,
  PathDraw,
} from '../../draw'
import type {
  InteractionEvent,
} from '../event'


export type MouseEvent = InteractionEvent & { mouse: NonNullable<InteractionEvent['mouse']> }
export type KeyEvent = InteractionEvent & { key: NonNullable<InteractionEvent['key']> }

export type StateMouseEvent = EventObject & { event: MouseEvent; hit?: PathHitResult; }
export type StateKeyEvent = EventObject & { event: KeyEvent }

export type StateEvent = EventObject | StateMouseEvent | StateKeyEvent


export interface StateContext {
  canvas: HTMLCanvasElement;
  machine?: VectorToolService;
  interactionEvent$: Subject<InteractionEvent>;
  subscription: Subscription[];
  lastMousePosition: Vector;

  vectorPath: VectorPath;
  anchorDraws: Map<VectorAnchor, AnchorDraw>;
  indicativeAnchor: AnchorDraw;
  indicativePath: PathDraw;

  selected: Array<[VectorAnchor, ('anchor' | 'inHandler' | 'outHandler')[]]>;
  changes: Array<
    | [AnchorDraw | undefined, AnchorDraw['style']]
    | [PathDraw | undefined, PathDraw['style']]
  >;
}

export type StateAction = ActionFunction<StateContext, StateEvent>

export type VectorToolMachine = StateMachine<StateContext, any, StateEvent>
export type VectorToolService = Interpreter<StateContext, any, StateEvent>
