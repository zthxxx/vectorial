import type { Renderer } from '@pixi/core'
import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import type { InteractionEvent } from '@pixi/interaction'
import { ShapeInfo, Intersection } from 'kld-intersections'
import {
  Point,
  Segment,
  Path,
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
} from "../../vector-shape"
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
                    this.indicative.vectorAnchor.setPositon(mouse)
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
                  const path = new Path({
                    strokeWidth: 10,
                    strokeColor: new Color(0x000),
                    segments: this.vectorPath.anchors.map(anchor => new Segment({
                      point: new Point(anchor.position),
                      handleIn: anchor.inHandler && new Point(anchor.inHandler),
                      handleOut: anchor.outHandler && new Point(anchor.outHandler),
                    })),
                  })

                  const hit = path.hitTest(new Point(mouse))
                  this.indicative.clear()
                  if (hit) {
                    this.indicative.vectorAnchor = new VectorAnchor(hit.point)
                    if (hit.type === 'segment') {
                      this.indicative.drawHighlightAnchor()
                    } else {

                    this.indicative.drawNormalAnchor()
                    }
                  }
                },
                (_, { mouse }: EventWithData) => {
                  return
                  // this.mouseBox
                  //   .clear()
                  //   .lineStyle({ width: 1, color: 0x18a0fb, })
                  //   .drawRect(
                  //     mouse.x - 2,
                  //     mouse.y - 2,
                  //     4,
                  //     4,
                  //   )

                  const segments = []
                  this.vectorPath.anchors.reduce((prev, curr) => {
                    segments.push(ShapeInfo.cubicBezier(
                      prev.position.x,
                      prev.position.y,
                      prev.position.x + (prev.outHandler?.x ?? 0),
                      prev.position.y + (prev.outHandler?.y ?? 0),
                      curr.position.x + (curr.inHandler?.x ?? 0),
                      curr.position.y + (curr.inHandler?.y ?? 0),
                      curr.position.x,
                      curr.position.y
                    ))
                    return curr
                  })

                  const path = new ShapeInfo(ShapeInfo.PATH, segments)
                  const mouseBox = ShapeInfo.rectangle(
                    mouse.x - 3,
                    mouse.y - 3,
                    6,
                    6,
                  )
                  const intersection = Intersection.intersect(path, mouseBox)
                  this.indicative.clear()
                  if (intersection.points.length) {
                    const intersectionPoint = intersection.points.reduce((prev, curr) => {
                      if (curr.x < prev.x) { return curr }
                      return prev
                    })

                    this.indicative.vectorAnchor = new VectorAnchor(intersectionPoint)
                    this.indicative.drawNormalAnchor()
                  }


                },
                (_, { mouse }: EventWithData) => {
                  return false
                  const interaction = this.parent.options.interaction!

                  const hover = this.anchorDraws.find(anchorDraw => (
                    interaction.hitTest(mouse, anchorDraw.container)
                  ))

                  if (hover) {
                    hover.drawSelectedAnchor()
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
    anchor.setOutHandler(sub(mouse, anchor.position))
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
