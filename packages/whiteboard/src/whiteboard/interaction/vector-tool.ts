import type { Renderer } from '@pixi/core'
import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import type { InteractionEvent } from '@pixi/interaction'
import {
  Point as PaperPoint,
  Segment as PaperSegment,
  Path as PaperPath,
  Color,
} from 'paper'
import {
  createMachine,
  interpret,
  actions,
  Interpreter,
  StateValue,
  EventObject,
} from 'xstate'
import type {
  Pane,
  MonitorBindingApi,
} from 'tweakpane'
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
  AnchorDraw,
  PathDraw,
} from '../draw'


const { send } = actions

type InteractionData = InteractionEvent['data']['global']

type EventWithData = EventObject & { mouse: InteractionData }

export interface VectorToolProps {
  renderer: Renderer;
  pane: Pane;
}

export class VectorTool extends Plugin {
  private stateBlade: MonitorBindingApi<string>
  private renderer: Renderer
  public status: string = ''
  public container: Container
  private machine: Interpreter<any, any, any, any, any>
  private vectorPath: VectorPath

  private indicative!: AnchorDraw
  private indicativePath: PathDraw
  private pathDraw: PathDraw
  private anchorDraws: AnchorDraw[] = []
  private mouseBox: Graphics
  private interactivePath: paper.Path

  constructor(parent: Viewport, props: VectorToolProps) {
    const {
      renderer,
      pane,
    } = props
    super(parent)
    this.renderer = renderer
    this.container = new Container()
    this.parent.addChild(this.container)
    this.stateBlade = pane.addMonitor(this, 'status', {
      label: 'Pen State',
      interval: 0,
    })

    this.vectorPath = new VectorPath()
    this.pathDraw = new PathDraw({
      path: this.vectorPath,
      color: 0xb0b0b0,
    })

    this.indicativePath = new PathDraw({
      path: new VectorPath(),
    })
    this.interactivePath = new PaperPath({
      strokeWidth: 10,
      strokeColor: new Color(0x000),
    })

    this.mouseBox = new Graphics()
    this.container.addChild(this.pathDraw.container)
    this.container.addChild(this.indicativePath.container)
    this.container.addChild(this.mouseBox)

    this.machine = this.createMachine()
    this.machine.onTransition((state) => {
      this.statusIndicate(state.value)
    })
  }

  public createMachine() {
    const machine = interpret(createMachine({
      id: 'mouse',
      initial: 'creating',
      entry: () => {
        this.newIndicativeAnchor()
      },
      states: {
        creating: {
          initial: 'indicating',
          states: {
            indicating: {
              on: {
                move: {
                  target: 'indicating',
                  actions: (_, { mouse }: EventWithData) => {
                    this.indicative.vectorAnchor.position = mouse
                    this.indicative.drawNormalAnchor()
                    this.drawIndicativePath([
                      this.vectorPath.anchors.at(-1),
                      this.indicative.vectorAnchor,
                    ])
                  }
                },
                down: {
                  target: 'condition',
                  actions: () => {
                    this.anchorDraws.at(-1)?.drawNormalAnchor()
                    this.anchorDraws.at(-2)?.clearHandler()
                    this.indicative.drawSelectedAnchor()

                    this.vectorPath.addAnchor(this.indicative.vectorAnchor)
                    this.anchorDraws.push(this.indicative)
                    this.interactivePath.add(
                      new PaperSegment(new PaperPoint(this.indicative.vectorAnchor.position))
                    )
                  },
                },
              },
            },
            condition: {
              on: {
                move: {
                  target: 'adjusting',
                  actions: (_, { mouse }: EventWithData) => {
                    if (this.isDeadDrag(mouse)) { return }
                    this.drawIndicative(mouse)
                  },
                },
                up: {
                  target: 'confirmDone',
                  actions: (_, { mouse }: EventWithData) => {
                    this.newIndicativeAnchor(mouse)
                    this.indicativePath.clear()
                    this.pathDraw.draw()
                  },
                },
              },
            },
            confirmDone: {
              after: {
                200: 'indicating',
              },
              on: {
                move: 'indicating',
                down: {
                  actions: [
                    send('done'),
                    () => {
                      this.anchorDraws.at(-1)?.drawNormalAnchor()
                      this.anchorDraws.at(-1)?.clearHandler()
                      this.anchorDraws.at(-2)?.clearHandler()
                    }
                  ],
                },
              },
            },
            adjusting: {
              on: {
                move: {
                  target: 'adjusting',
                  actions: (_, { mouse }: EventWithData) => {
                    if (this.isDeadDrag(mouse)) { return }
                    this.drawIndicative(mouse)
                    this.drawIndicativePath([
                      this.vectorPath.anchors.at(-2),
                      this.indicative.vectorAnchor,
                    ])
                  },
                },
                up: {
                  target: 'indicating',
                  actions: (_, { mouse }: EventWithData) => {
                    this.newIndicativeAnchor(mouse)
                    this.indicativePath.clear()
                    this.pathDraw.draw()
                  },
                },
              },
            },
          },
          on: {
            done: 'selecting',
          },
        },
        selecting: {
          on: {
            move: {
              target: 'selecting',
              actions: [
                (_, { mouse }: EventWithData) => {
                  const hit = this.vectorPath.hitTest(mouse)
                  this.indicative.clear()
                  this.indicativePath.clear()
                  if (hit) {
                    const { type, point, ends } = hit
                    this.indicative.vectorAnchor = point
                    if (type === PathHitType.Anchor) {
                      this.indicative.drawHighlightAnchor()
                    }
                    if (type === PathHitType.Stroke) {
                      this.indicative.drawNormalAnchor()
                      this.drawIndicativePath(ends)
                    }
                  }
                },
              ],
            },
            creating: 'creating',
            adjusting: 'adjusting',
          },
        },
        adjusting: {
          on: {
            up: 'selecting',
          },
        },
      },
    }))

    machine.start()

    return machine
  }

  public statusIndicate(status: StateValue) {
    const stateToString = (status: StateValue): string => (
      typeof status === 'string'
        ? status
        : Object.entries(status)
          .map(([key, value]) => `${key}.${stateToString(value)}`)
          .join(',')
    )

    this.status = stateToString(status)
    this.stateBlade.refresh()
  }

  public isDeadDrag(mouse: Vector): boolean {
    const delta = sub(mouse, this.indicative.vectorAnchor.position)
    return len(delta) < 5
  }

  public newIndicativeAnchor(mouse?: Vector) {
    const anchor = new VectorAnchor(mouse)
    this.indicative = new AnchorDraw({
      renderer: this.renderer,
      vectorAnchor: anchor,
    })
    this.container.addChild(this.indicative.container)
  }

  public drawIndicative(mouse: Vector) {
    const anchor = this.indicative.vectorAnchor
    anchor.handlerType = HandlerType.Mirror
    anchor.outHandler = sub(mouse, anchor.position)
    this.indicative.drawNormalHandler('in')
    this.indicative.drawNormalHandler('out')
    this.indicative.drawHandlerLine()
  }

  public drawIndicativePath(anchors: (VectorAnchor | undefined)[]) {
    const points: VectorAnchor[] = anchors.filter(Boolean) as VectorAnchor[]
    if (points.length > 1) {
      this.indicativePath.path.anchors = [...points]
      this.indicativePath.draw()
    }
  }

  public move(e: InteractionEvent): boolean {
    this.machine.send({
      type: 'move',
      mouse: e.data.global,
    })

    return false
  }

  public down(e: InteractionEvent): boolean {
    this.machine.send({
      type: 'down',
      mouse: e.data.global,
    })

    return false
  }

  public up(e: InteractionEvent): boolean {
    this.machine.send({
      type: 'up',
      mouse: e.data.global,
    })

    return false
  }
}
