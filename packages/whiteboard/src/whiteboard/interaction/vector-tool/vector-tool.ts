import type { Renderer } from '@pixi/core'
import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Container } from '@pixi/display'
import { Observable, from, Subject } from 'rxjs'
import {
  filter,
  tap,
  takeUntil,
} from 'rxjs/operators'
import {
  interpret,
  State,
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
  DefaultPathColor,
} from '../../draw'
import type { InteractionEvent } from '../event'
import type {
  StateContext,
  StateEvent,
  VectorToolService,
} from './types'
import {
  createVectorToolMachine,
} from './state-machine'

export interface VectorToolProps {
  renderer?: Renderer;
  interactionEvent$: Observable<InteractionEvent>;
  pane: FolderApi;
  canvas: HTMLCanvasElement;
  vectorPath?: VectorPath;
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
  public status: string = ''
  private stateBlade: MonitorBindingApi<string>
  private interactionEvent$: Observable<InteractionEvent>
  private canvas: HTMLCanvasElement;
  private pane: FolderApi;
  private vectorPath: VectorPath
  private toolLayer?: ToolLayer

  constructor(parent: Viewport, props: VectorToolProps) {
    const {
      renderer,
      interactionEvent$,
      pane,
      canvas,
      vectorPath,
    } = props
    AnchorDraw.renderer = renderer
    super(parent)
    this.pane = pane
    this.canvas = canvas
    this.vectorPath = vectorPath || new VectorPath()
    this.interactionEvent$ = interactionEvent$

    this.stateBlade = pane.addMonitor(this, 'status', {
      label: 'PenState',
      interval: 0,
    })

    this.resume()
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

  public setVectorPath(vectorPath: VectorPath): void {
    if (!this.paused) {
      throw new Error('Cannot set vector path while tool is running')
    }
    this.vectorPath = vectorPath
  }

  public pause(): void {
    this.stateBlade.hidden = true
    this.toolLayer?.machine.stop()
    this.toolLayer?.destroy()
    this.toolLayer = undefined
  }

  public resume(): void {
    this.stateBlade.hidden = false
    this.toolLayer = new ToolLayer(this.parent, {
      interactionEvent$: this.interactionEvent$,
      pane: this.pane,
      canvas: this.canvas,
      vectorPath: this.vectorPath,
    })

    this.toolLayer.machineSignal$.pipe(
      tap(({ value }) => this.statusIndicate(value)),
    ).subscribe({
      complete: () => this.editDone(),
    })
  }

  public editDone(): void {
    // this.pause()
  }
}


class ToolLayer {
  private parent: Container
  public container: Container
  private interactionEvent$: Observable<InteractionEvent>
  public machine: VectorToolService

  private lastMousePosition: Vector
  private vectorPath: VectorPath
  private pathDraw: PathDraw
  private anchorDraws: Map<VectorAnchor, AnchorDraw>
  private indicativeAnchor: AnchorDraw
  private indicativePath: PathDraw
  private selected: StateContext['selected'] = []
  private changes: StateContext['changes'] = []
  public stateContext: StateContext
  public doneSignal$: Subject<void>
  public machineSignal$: Observable<State<StateContext, StateEvent>>

  constructor(parent: Viewport, props: VectorToolProps) {
    const {
      interactionEvent$,
      canvas,
      vectorPath,
    } = props
    this.parent = parent
    this.container = new Container()
    this.parent.addChild(this.container)

    this.vectorPath = vectorPath ?? new VectorPath()
    this.pathDraw = new PathDraw({
      path: this.vectorPath,
      style: {
        strokeWidth: 1,
        strokeColor: DefaultPathColor.normal,
        fillColor: 0xd0d0d0,
      },
    })

    // aviod initial point display
    this.lastMousePosition = {
      x: -10000,
      y: -10000,
    }

    this.doneSignal$ = new Subject()
    this.interactionEvent$ = interactionEvent$.pipe(
      takeUntil(this.doneSignal$),
      tap(event => {
        if (!event.mouse) return
        const localPoint = this.vectorPath.toLocalPoint(event.mouse)
        event.mouse.x = localPoint.x
        event.mouse.y = localPoint.y
      })
    )

    this.interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
    ).subscribe(event => {
      this.lastMousePosition.x = event.mouse!.x
      this.lastMousePosition.y = event.mouse!.y
    })

    this.indicativeAnchor = new AnchorDraw({
      vectorAnchor: new VectorAnchor(this.lastMousePosition),
    })
    this.indicativePath = new PathDraw({
      path: new VectorPath(),
      style: {
        strokeWidth: 1,
        strokeColor: DefaultPathColor.highlight,
      },
    })

    const anchorDrawsLayer = new Container()
    this.anchorDraws = new DrawsMap(
      this.vectorPath.anchors.map(vectorAnchor => [
        vectorAnchor,
        new AnchorDraw({
          vectorAnchor,
          style: { anchor: 'normal' },
        }),
      ]),
      anchorDrawsLayer,
    )

    this.container.addChild(this.pathDraw.container)
    this.container.addChild(this.indicativePath.container)
    this.container.addChild(anchorDrawsLayer)
    this.container.addChild(this.indicativeAnchor.container)

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

    this.machine = interpret(createVectorToolMachine(this.stateContext))
    this.stateContext.machine = this.machine

    this.machineSignal$ = from(this.machine).pipe(
      tap(({ context }) => this.drawChanges(context)),
      tap((state) => {
        if (state.done) {
          this.doneSignal$.next()
          this.doneSignal$.complete()
        }
      })
    )

    this.startMachine()
  }

  public drawChanges(context: StateContext) {
    while (context.changes.length) {
      const [item, style] = context.changes.shift() as StateContext['changes'][number]
      if (!item) continue
      item.style = style
        ? { ...item.style, ...style }
        : undefined
      item.draw()
    }
    this.pathDraw.draw()
  }

  public startMachine() {
    setTimeout(() => {
      this.machine.start()
    }, 0)
  }

  public destroy() {
    this.parent.removeChild(this.container)
    this.container.destroy({ children: true })
  }
}
