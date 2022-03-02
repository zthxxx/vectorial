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
  AnchorNode,
  PathNode,
  DefaultPathColor,
} from '../../nodes'
import {
  LayerManager
} from '../../layer'
import type { InteractionEvent } from '../event'
import type {
  StateContext,
  StateEvent,
  VectorToolService,
} from './types'
import {
  createVectorToolMachine,
} from './state-machine'

class DrawsMap extends Map<VectorAnchor, AnchorNode> {
  public container: Container

  constructor(entries: [VectorAnchor, AnchorNode][], container: Container) {
    super()
    this.container = container
    entries.forEach(([key, value]) => this.set(key, value))
  }

  public set(key: VectorAnchor, value: AnchorNode): this {
    this.container.addChildAt(value.container, 0)
    return super.set(key, value)
  }

  public delete(key: VectorAnchor): boolean {
    this.container.removeChild(this.get(key)!.container)
    return super.delete(key)
  }
}

export interface VectorToolProps {
  layerManager: LayerManager;
  renderer?: Renderer;
  interactionEvent$: Observable<InteractionEvent>;
  pane: FolderApi;
  canvas: HTMLCanvasElement;
  vectorPath?: VectorPath;
}

export class VectorTool extends Plugin {
  public status: string = ''
  private stateBlade: MonitorBindingApi<string>
  private layerManager: LayerManager
  private interactionEvent$: Observable<InteractionEvent>
  private canvas: HTMLCanvasElement;
  private pathNode?: PathNode
  private toolLayer?: ToolLayer

  constructor(parent: Viewport, props: VectorToolProps) {
    const {
      layerManager,
      renderer,
      interactionEvent$,
      pane,
      canvas,
    } = props
    AnchorNode.renderer = renderer
    super(parent)
    this.canvas = canvas

    this.layerManager = layerManager
    this.interactionEvent$ = interactionEvent$

    this.stateBlade = pane.addMonitor(this, 'status', {
      label: 'PenState',
      interval: 0,
    })

    this.pause()
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

  public getSelecedPath(): PathNode | undefined {
    return [...this.layerManager.selected][0]
  }

  public setSelectedPath(): void {
    if (!this.paused) {
      throw new Error('Cannot set path node while tool is running')
    }
    this.pathNode = this.getSelecedPath()
    if (!this.pathNode) {
      this.pathNode = new PathNode({
        path: new VectorPath(),
        style: {
          strokeWidth: 2,
          strokeColor: DefaultPathColor.normal,
          fillColor: 0xd0d0d0,
        },
      })

      this.layerManager.nodesLayer.addChild(this.pathNode.container)
      this.layerManager.addLayer(this.pathNode)
    }
  }

  public pause(): void {
    this.paused = true
    this.stateBlade.hidden = true
    this.toolLayer?.machine.stop()
    this.toolLayer?.destroy()
    this.toolLayer = undefined
    this.pathNode = undefined
    this.parent.plugins.get('SelectTool')?.resume()
  }

  public resume(): void {
    this.setSelectedPath()
    this.paused = false

    this.stateBlade.hidden = false
    this.toolLayer = new ToolLayer({
      interactLayer: this.layerManager.interactLayer,
      interactionEvent$: this.interactionEvent$,
      canvas: this.canvas,
      vectorPath: this.pathNode!.path,
    })

    this.toolLayer.machineSignal$.pipe(
      tap(({ value }) => this.statusIndicate(value)),
      tap(() => this.pathNode!.draw()),
    ).subscribe({
      complete: () => this.editDone(),
    })
  }

  public editDone(): void {
    if (this.pathNode) {
      if (this.pathNode.path.anchors.length < 2) {
        this.layerManager.nodesLayer.removeChild(this.pathNode.container)
        this.layerManager.remove(this.pathNode)
      }
      this.layerManager.select([this.pathNode])
    }

    this.pause()
  }
}


interface ToolLayerProps {
  interactLayer: Container;
  interactionEvent$: Observable<InteractionEvent>;
  canvas: HTMLCanvasElement;
  vectorPath?: VectorPath;
}

class ToolLayer {
  public container: Container
  private interactLayer: Container
  private interactionEvent$: Observable<InteractionEvent>
  public machine: VectorToolService

  private lastMousePosition: Vector
  private vectorPath: VectorPath
  private pathNode: PathNode
  private anchorNodes: Map<VectorAnchor, AnchorNode>
  private indicativeAnchor: AnchorNode
  private indicativePath: PathNode
  private selected: StateContext['selected'] = []
  private changes: StateContext['changes'] = []
  public stateContext: StateContext
  public doneSignal$: Subject<void>
  public machineSignal$: Observable<State<StateContext, StateEvent>>

  constructor(props: ToolLayerProps) {
    const {
      interactLayer,
      interactionEvent$,
      canvas,
      vectorPath,
    } = props
    this.interactLayer = interactLayer
    this.container = new Container()
    this.interactLayer.addChild(this.container)

    this.vectorPath = vectorPath ?? new VectorPath()
    this.pathNode = new PathNode({
      path: this.vectorPath,
      style: {
        strokeWidth: 1,
        strokeColor: DefaultPathColor.normal,
        // here fillColor for develop debug
        // fillColor: 0xd0d0d0,
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

    this.indicativeAnchor = new AnchorNode({
      vectorAnchor: new VectorAnchor(this.lastMousePosition),
    })
    this.indicativePath = new PathNode({
      path: new VectorPath(),
      style: {
        strokeWidth: 1,
        strokeColor: DefaultPathColor.highlight,
      },
    })

    const anchorNodesLayer = new Container()
    this.anchorNodes = new DrawsMap(
      this.vectorPath.anchors.map(vectorAnchor => [
        vectorAnchor,
        new AnchorNode({
          vectorAnchor,
          style: { anchor: 'normal' },
        }),
      ]),
      anchorNodesLayer,
    )

    for (const anchor of this.anchorNodes.values()) { anchor.draw() }

    this.container.addChild(this.pathNode.container)
    this.container.addChild(this.indicativePath.container)
    this.container.addChild(anchorNodesLayer)
    this.container.addChild(this.indicativeAnchor.container)

    this.stateContext = {
      canvas,
      interactionEvent$: this.interactionEvent$,
      subscription: [],
      lastMousePosition: this.lastMousePosition,
      vectorPath: this.vectorPath,
      anchorNodes: this.anchorNodes,
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
    this.pathNode.draw()
  }

  public startMachine() {
    setTimeout(() => {
      this.machine.start()
    }, 0)
  }

  public destroy() {
    this.interactLayer.removeChild(this.container)
    this.container.destroy({ children: true })
  }
}
