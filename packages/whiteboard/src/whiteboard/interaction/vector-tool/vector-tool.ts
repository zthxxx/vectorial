import type { Renderer } from '@pixi/core'
import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Container } from '@pixi/display'
import { Subject, from } from 'rxjs'
import {
  filter,
  tap,
} from 'rxjs/operators'
import {
  interpret,
  StateValue,
} from 'xstate'
import type {
  FolderApi,
  MonitorBindingApi,
} from 'tweakpane'
import {
  VectorPath,
  VectorAnchor,
  Vector,
} from 'vectorial'
import {
  AnchorDraw,
  PathDraw,
} from '../../draw'
import type { InteractionEvent } from '../event'
import {
  StateContext,
  VectorToolService,
  createVectorToolMachine,
} from './state-machine'

export interface VectorToolProps {
  renderer: Renderer;
  interactionEvent$: Subject<InteractionEvent>;
  pane: FolderApi;
  canvas: HTMLCanvasElement;
}

class DrawsMap extends Map<VectorAnchor, AnchorDraw> {
  public container: Container

  constructor(entries: [VectorAnchor, AnchorDraw][], container: Container) {
    super(entries)
    this.container = container
  }

  public set(key: VectorAnchor, value: AnchorDraw): this {
    this.container.addChildAt(value.container, 0)
    return super.set(key, value)
  }

  public delete(key: VectorAnchor): boolean {
    this.container.removeChild(this.get(key)!.container)
    return super.delete(key)
  }
}

export class VectorTool extends Plugin {
  private stateBlade: MonitorBindingApi<string>
  private interactionEvent$: Subject<InteractionEvent>
  public status: string = ''
  public container: Container
  private machine: VectorToolService

  private lastMousePosition: Vector
  private vectorPath: VectorPath
  private pathDraw: PathDraw
  private anchorDraws: Map<VectorAnchor, AnchorDraw>
  private indicativeAnchor: AnchorDraw
  private indicativePath: PathDraw
  private selected: StateContext['selected'] = []
  private changes: StateContext['changes'] = []

  public stateContext: StateContext

  constructor(parent: Viewport, props: VectorToolProps) {
    const {
      renderer,
      interactionEvent$,
      pane,
      canvas,
    } = props
    super(parent)
    AnchorDraw.renderer = renderer

    this.interactionEvent$ = interactionEvent$
    this.container = new Container()
    this.parent.addChild(this.container)

    this.stateBlade = pane.addMonitor(this, 'status', {
      label: 'PenState',
      interval: 0,
    })

    this.vectorPath = new VectorPath()
    this.pathDraw = new PathDraw({
      path: this.vectorPath,
    })
    // aviod initial point display
    this.lastMousePosition = {
      x: -10000,
      y: -10000,
    }

    this.indicativeAnchor = new AnchorDraw({
      vectorAnchor: new VectorAnchor(this.lastMousePosition),
    })
    this.indicativePath = new PathDraw({
      path: new VectorPath(),
      style: {
        color: 0xb0b0b0,
      },
    })

    const anchorDrawsLayer = new Container()

    this.container.addChild(this.pathDraw.container)
    this.container.addChild(anchorDrawsLayer)
    this.container.addChild(this.indicativePath.container)
    this.container.addChild(this.indicativeAnchor.container)

    this.anchorDraws = new DrawsMap([], anchorDrawsLayer)

    this.stateContext = {
      canvas,
      interactionEvent$: this.interactionEvent$,
      subscription: [],
      lastMousePosition: this.lastMousePosition,
      vectorPath: this.vectorPath,
      anchorDraws: this.anchorDraws,
      indicativeAnchor: this.indicativeAnchor,
      indicativePath: this.indicativePath,
      selected: this.selected,
      changes: this.changes,
    }

    this.interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
    ).subscribe(event => {
      this.lastMousePosition.x = event.mouse!.x
      this.lastMousePosition.y = event.mouse!.y
    })

    this.machine = interpret(createVectorToolMachine(this.stateContext))
    this.stateContext.machine = this.machine

    from(this.machine).pipe(
      tap(({ value }) => this.statusIndicate(value)),
      tap(({ context }) => this.drawChanges(context)),
    ).subscribe()

    this.machine.start()
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

  public drawChanges(context: StateContext) {
    while (context.changes.length) {
      const [item, style] = context.changes.pop() as StateContext['changes'][number]
      if (!item) continue
      item.style = style
        ? { ...item.style, ...style }
        : undefined
      item.draw()
    }
    this.pathDraw.draw()
  }
}
