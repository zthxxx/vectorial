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
  PathHitResult,
} from 'vectorial'
import type {
  AnchorNode,
  PathNode,
} from '../../nodes'
import type {
  InteractionEvent,
  MouseEvent,
  KeyEvent,
} from '../event'

export type {
  MouseEvent,
  KeyEvent,
}
export type StateMouseEvent = EventObject & { event: MouseEvent; hit?: PathHitResult; }
export type StateKeyEvent = EventObject & { event: KeyEvent }

export type StateEvent = EventObject | StateMouseEvent | StateKeyEvent


export interface StateContext {
  canvas: HTMLCanvasElement;
  machine?: VectorToolService;
  interactionEvent$: Observable<InteractionEvent>;
  subscription: Subscription[];
  lastMousePosition: Vector;

  vectorPath: VectorPath;
  anchorNodes: Map<VectorAnchor, AnchorNode>;
  indicativeAnchor: AnchorNode;
  indicativePath: PathNode;

  /**
   * selected anchors or handler,
   * only anchors could be multi-selected
   */
  selected: PathHitResult[];

  /**
   * mouse drag begin position
   * use for dead drag detection, and for judge whether an Anchor is new in selected or not
   * NOTE: maybe reset by `context.dragBase = ...`
   */
  dragBase?: Vector;
  /**
   * create path point next of creatingBase
   * use for mark creating direction of new path anchor (prev or next)
   * NOTE: maybe reset by `context.creatingBase = ...`
   */
  creatingBase?: VectorAnchor;

  changes: Array<
    | [AnchorNode | undefined, AnchorNode['style']]
    | [PathNode | undefined, PathNode['style']]
  >;
}

export type StateAction = ActionFunction<StateContext, StateEvent>

export type VectorToolMachine = StateMachine<StateContext, any, StateEvent>
export type VectorToolService = Interpreter<StateContext, any, StateEvent>
