import type { Renderer } from '@pixi/core'
import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import type { InteractionEvent } from '@pixi/interaction'
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
  EditingPathDraw,
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
  private machine: Interpreter<any, any, any, any, any>
  private vectorPath: VectorPath

  private indicative!: AnchorDraw
  private indicativePath: EditingPathDraw
  private pathDraw: EditingPathDraw
  private anchorDraws: AnchorDraw[] = []

  constructor(parent: Viewport, props: VectorToolProps) {
    const {
      renderer,
      pane,
    } = props
    super(parent)
    this.renderer = renderer
    this.stateBlade = pane.addMonitor(this, 'status', {
      label: 'pen state',
      interval: 0,
    })

    this.vectorPath = new VectorPath()
    this.pathDraw = new EditingPathDraw({
      path: this.vectorPath,
      color: 0xb0b0b0,
    })

    this.indicativePath = new EditingPathDraw({
      path: new VectorPath(),
    })
    this.parent.addChild(this.pathDraw.container)
    this.parent.addChild(this.indicativePath.container)

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
                    const last = this.vectorPath.anchors.at(-1)
                    this.drawIndicativePath(last)
                  }
                },
                down: {
                  target: 'condition',
                  actions: (_, { mouse }: EventWithData) => {
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
                    if (this.isDeadDrag(mouse)) {
                      return
                    }
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
                    if (this.isDeadDrag(mouse)) {
                      return
                    }
                    this.drawIndicative(mouse)
                    const last = this.vectorPath.anchors.at(-2)
                    this.drawIndicativePath(last)
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
            creating: 'creating',
            adjusting: 'adjusting',
            move: 'selecting',
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
    this.parent.addChild(this.indicative.container)
  }

  public drawIndicative(mouse: Vector) {
    const anchor = this.indicative.vectorAnchor
    anchor.handlerType = HandlerType.Mirror
    anchor.setOutHandler(sub(mouse, anchor.position))
    this.indicative.drawNormalHandler('in')
    this.indicative.drawNormalHandler('out')
    this.indicative.drawHandlerLine()
  }

  public drawIndicativePath(last?: VectorAnchor) {
    if (last) {
      const current = this.indicative.vectorAnchor
      this.indicativePath.path.anchors = [last, current]
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
