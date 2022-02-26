import type { Subject, Subscription } from 'rxjs'
import {
  tap,
  filter,
} from 'rxjs/operators'
import {
  createMachine,
  Interpreter,
  StateMachine,
  EventObject,
  ActionFunction,
} from 'xstate'
import {
  VectorPath,
  VectorAnchor,
  HandlerType,
  sub,
  len,
  Vector,
  PathHitType,
} from 'vectorial'
import {
  icon,
} from '../../assets'
import {
  AnchorDraw,
  PathDraw,
  DefaultPathColor,
} from '../../draw'
import {
  InteractionEvent,
  MouseTriggerType,
  MouseButton,
} from '../event'


export type MouseEvent = InteractionEvent & { mouse: NonNullable<InteractionEvent['mouse']> }
export type KeyEvent = InteractionEvent & { key: NonNullable<InteractionEvent['key']> }

export type StateMouseEvent = EventObject & { event: MouseEvent }
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


export type VectorToolMachine = StateMachine<StateContext, any, StateEvent>
export type VectorToolService = Interpreter<StateContext, any, StateEvent>

export const createVectorToolMachine = (context: StateContext): VectorToolMachine =>
  createMachine<StateContext, StateEvent>({
    id: 'vector-tool',
    initial: 'initial',
    context,
    states: {
      initial: {
        always: [
          {
            target: 'creating',
            cond: ({ vectorPath }) => !vectorPath.anchors.length,
          },
          {
            target: 'selecting',
            cond: ({ vectorPath }) => vectorPath.anchors.length > 0,
          },
        ],
      },
      creating: {
        initial: 'indicating',
        entry: enterCreating,
        exit: exitCreating,
        states: {
          indicating: {
            entry: enterIndicating,
            exit: unsubscribeAll,
            on: {
              move: {
                actions: indicatingMove,
              },
              hover: {
                actions: indicativeHover,
              },
              create: {
                target: 'condition',
                actions: indicatingCreate,
              },
              closePath: {
                target: 'done',
                actions: indicatingClosePath,
              },
              // select: 'selecting.selected',
            },
          },
          condition: {
            entry: enterCondition,
            exit: unsubscribeAll,
            on: {
              move: {
                target: 'adjusting',
                actions: adjustingMove,
              },
              release: {
                target: 'twoStepsConfirm',
                actions: adjustingRelease,
              }
            }
          },
          twoStepsConfirm: {
            entry: enterTwoStepsConfirm,
            exit: unsubscribeAll,
            after: {
              200: 'indicating',
            },
            on: {
              move: 'indicating',
              confirm: {
                target: 'done',
                actions: createDone,
              },
            }
          },
          adjusting: {
            entry: enterCondition,
            exit: unsubscribeAll,
            on: {
              move: {
                actions: adjustingMove,
              },
              release: {
                target: 'indicating',
                actions: adjustingRelease,
              },
            }
          },
          done: {
            type: 'final',
          }
        },
        onDone: 'selecting',
      },
      selecting: {
        initial: 'idle',
        states: {
          idle: {
            entry: enterIdle,
            exit: unsubscribeAll,
            on: {
              move: {
                actions: indicativeHover,
              },
            },
          },
          selected: {},
          marquee: {},
        },
        on: {
          creating: 'creating',
          done: 'done',
        }
      },
      done: {},
    },
  })


type StateAction = ActionFunction<StateContext, StateEvent>

const unsubscribeAll: StateAction = ({ subscription }) => {
  while(subscription.length) subscription.pop()!.unsubscribe()
}

const enterCreating: StateAction = ({
  canvas,
  indicativeAnchor,
  lastMousePosition,
  changes,
}) => {
  canvas.parentElement!.style.cursor = `url('${icon.pen}'), auto`
  indicativeAnchor.vectorAnchor.position = lastMousePosition
  changes.push([indicativeAnchor, { anchor: 'normal', inHandler: undefined, outHandler: undefined }])

  // @TODO: Listening to keyboard event, like 'ESC' and 'Enter'
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/CSS/cursor#values
 */
const exitCreating: StateAction = ({ canvas }) => { canvas.parentElement!.style.cursor = 'default' }

const enterIndicating: StateAction = ({
  interactionEvent$,
  subscription,
  vectorPath,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      filter((event: MouseEvent) => {
        const hit = vectorPath.hitTest(event.mouse)
        if (!hit) return true

        if (
          event.mouse.type === MouseTriggerType.Down
          && event.match({ mouse: [MouseButton.Left] })
          && hit.type === PathHitType.Anchor
          && hit.point === vectorPath.anchors[0]
        ) {
          machine?.send({ type: 'closePath' })
        } else {
          machine?.send({ type: 'hover' })
        }

        return false
      }),
      filter((event: MouseEvent) => {
        if (event.mouse.type !== MouseTriggerType.Move) return true
        machine?.send({ type: 'move', event })
        return false
      }),
      filter((event: MouseEvent) => event.match({ mouse: [MouseButton.Left] })),
      tap((event: MouseEvent) => { machine?.send({ type: 'create', event }) }),
    ).subscribe(),
  )
}

const indicatingMove: StateAction = ({
  canvas,
  vectorPath,
  indicativeAnchor,
  indicativePath,
  changes,
}, { event }: StateMouseEvent) => {
  canvas.parentElement!.style.cursor = `url('${icon.pen}'), auto`
  indicativeAnchor.vectorAnchor.position = event.mouse
  indicativeAnchor.vectorAnchor.inHandler = undefined
  indicativeAnchor.vectorAnchor.outHandler = undefined
  changes.push([
    indicativeAnchor,
    { anchor: 'normal', inHandler: undefined, outHandler: undefined },
  ])
  indicativePath.path.anchors = [
    vectorPath.anchors.at(-1),
    indicativeAnchor.vectorAnchor,
  ].filter(Boolean) as VectorAnchor[]
  changes.push([indicativePath, { width: 1, color: DefaultPathColor.highlight }])
}

const indicatingCreate: StateAction = ({
  indicativeAnchor,
  vectorPath,
  anchorDraws,
  changes,
}, { event }: StateMouseEvent) => {
  const { anchors } = vectorPath
    changes.push(
      [
        anchorDraws.get(anchors.at(-1)!),
        { anchor: 'normal' },
      ],
      [
        anchorDraws.get(anchors.at(-2)!),
        { anchor: 'normal', inHandler: undefined, outHandler: undefined },
      ],
    )

  indicativeAnchor.vectorAnchor.position = event.mouse
  indicativeAnchor.vectorAnchor.inHandler = undefined
  indicativeAnchor.vectorAnchor.outHandler = undefined
  indicativeAnchor.vectorAnchor.handlerType = HandlerType.None
  changes.push([indicativeAnchor, { anchor: 'selected', inHandler: undefined, outHandler: undefined }])
}

const indicativeHover: StateAction = ({
  canvas,
  lastMousePosition,
  vectorPath,
  indicativeAnchor,
  indicativePath,
  changes,
}) => {
  const hit = vectorPath.hitTest(lastMousePosition)

  if (!hit) {
    changes.push([indicativeAnchor, undefined])
    changes.push([indicativePath, undefined])
    return
  }

  canvas.parentElement!.style.cursor = 'default'
  const { type, point, ends } = hit
  indicativeAnchor.vectorAnchor = point.clone()

  switch (type) {
    case (PathHitType.Anchor):{
      const first = vectorPath.anchors.at(0)
      const last = vectorPath.anchors.at(-1)
      changes.push([indicativeAnchor, { anchor: 'highlight', inHandler: 'normal', outHandler: 'normal' }])
      if (
        hit.point === first
        && vectorPath.anchors.length >= 2
      ) {
        indicativePath.path.anchors = [last!, first]
        changes.push([indicativePath, { width: 1, color: DefaultPathColor.highlight }])
      } else {
        changes.push([indicativePath, undefined])
      }
      break
    }
    case (PathHitType.InHandler):{
      changes.push([indicativeAnchor, { inHandler: 'highlight' }])
      changes.push([indicativePath, undefined])
      break
    }
    case (PathHitType.OutHandler): {
      changes.push([indicativeAnchor, { outHandler: 'highlight' }])
      changes.push([indicativePath, undefined])
      break
    }
    case (PathHitType.Stroke): {
      indicativePath.path.anchors = [...ends]
      changes.push(
        [indicativeAnchor, { anchor: 'normal', inHandler: undefined, outHandler: undefined }],
        [indicativePath, { width: 1, color: DefaultPathColor.highlight }],
      )
      break
    }
  }
}

const indicatingClosePath: StateAction = (context, event, meta) => {
  const { vectorPath } = context
  vectorPath.closed = true
  createDone(context, event, meta)
}

const enterCondition: StateAction = ({
  interactionEvent$,
  subscription,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      tap((event: MouseEvent) => {
        if (event.mouse.type === MouseTriggerType.Move)
          machine?.send({ type: 'move', event })
      }),
      tap((event: MouseEvent) => {
        if (event.mouse.type === MouseTriggerType.Up && !event.downMouse.size)
          machine?.send({ type: 'release', event })
      }),
    ).subscribe(),
  )
}

const isDeadDrag = (prev: Vector, next: Vector): boolean =>
  len(sub(prev, next)) < 5

const adjustingMove: StateAction = ({
  vectorPath,
  indicativeAnchor,
  indicativePath,
  changes,
}, { event }: StateMouseEvent) => {
  if (isDeadDrag(
    indicativeAnchor.vectorAnchor.position,
    event.mouse,
  )) { return }

  const anchor = indicativeAnchor.vectorAnchor
  if (event.match({ modifiers: ['Alt'] })) {
    anchor.handlerType = HandlerType.Free
  } else {
    anchor.handlerType = HandlerType.Mirror
  }

  anchor.outHandler = sub(event.mouse, anchor.position)

  changes.push([indicativeAnchor, { anchor: 'selected', inHandler: 'normal', outHandler: 'normal' }])

  indicativePath.path.anchors = [
    vectorPath.anchors.at(-1),
    indicativeAnchor.vectorAnchor,
  ].filter(Boolean) as VectorAnchor[]
  changes.push([indicativePath, { width: 1, color: DefaultPathColor.highlight }])
}

const adjustingRelease: StateAction = ({
  vectorPath,
  anchorDraws,
  indicativeAnchor,
  indicativePath,
  changes,
}) => {
  const vectorAnchor = indicativeAnchor.vectorAnchor.clone()
  const anchorDraw = new AnchorDraw({ vectorAnchor })
  vectorPath.addAnchor(vectorAnchor)
  anchorDraws.set(vectorAnchor, anchorDraw)
  changes.push([anchorDraw, { anchor: 'selected', inHandler: 'normal', outHandler: 'normal' }])

  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])
}

const enterTwoStepsConfirm: StateAction = ({
  interactionEvent$,
  subscription,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      tap((event: MouseEvent) => {
        if (event.mouse.type === MouseTriggerType.Move)
          machine?.send({ type: 'move', event })
      }),
      tap((event: MouseEvent) => {
        if (event.mouse.type === MouseTriggerType.Down && event.match({ mouse: [MouseButton.Left] }))
          machine?.send({ type: 'confirm', event })
      }),
    ).subscribe(),
  )
}

const createDone: StateAction = ({
  indicativeAnchor,
  indicativePath,
  vectorPath,
  anchorDraws,
  changes,
}) => {
  changes.push(
    [
      anchorDraws.get(vectorPath.anchors.at(-1)!),
      { anchor: 'normal', inHandler: undefined, outHandler: undefined },
    ],
    [
      anchorDraws.get(vectorPath.anchors.at(-2)!),
      { anchor: 'normal', inHandler: undefined, outHandler: undefined },
    ],
  )
  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])
}

const enterIdle: StateAction = ({
  interactionEvent$,
  subscription,
  machine,
}) => {
  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse) && event.mouse!.type === MouseTriggerType.Move),
      tap((event: MouseEvent) => {
        machine?.send({ type: 'move', event })
      }),
    ).subscribe(),
  )
}
