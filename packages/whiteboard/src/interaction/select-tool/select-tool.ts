import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Observable, from } from 'rxjs'
import {
  filter,
  tap,
} from 'rxjs/operators'
import type {
  FolderApi,
  MonitorBindingApi,
} from 'tweakpane'
import {
  interpret,
  State,
  StateValue,
} from 'xstate'
import type { LayerManager } from '../../layer'
import {
  PathNode,
} from '../../nodes'
import {
  InteractionEvent,
} from '../event'
import {
  drawSelection,
  highlightNodes,
  hoverStyle,
} from './highlight'
import {
  createSelectToolMachine,
} from './state-machine'
import {
  StateEvent,
  StateContext,
  SelectToolService,
} from './types'

export interface SelectToolProps {
  pane: FolderApi;
  layerManager: LayerManager;
  interactionEvent$: Observable<InteractionEvent>;
}

export class SelectTool extends Plugin {
  public status: string = ''
  private selectLayer: Container
  private boundaryLayer: Graphics
  private marqueeLayer: Graphics
  private stateBlade: MonitorBindingApi<string>
  private layerManager: LayerManager
  private interactionEvent$: Observable<InteractionEvent>

  private machine?: SelectToolService
  private stateContext: StateContext
  public machineSignal$?: Observable<State<StateContext, StateEvent>>

  constructor(parent: Viewport, props: SelectToolProps) {
    const {
      pane,
      layerManager,
      interactionEvent$,
    } = props
    super(parent)

    this.layerManager = layerManager
    this.selectLayer = new Container()
    this.boundaryLayer = new Graphics()
    this.marqueeLayer = new Graphics()

    this.layerManager.interactLayer.addChild(
      this.selectLayer,
      this.boundaryLayer,
      this.marqueeLayer,
    )
    this.interactionEvent$ = interactionEvent$.pipe(
      filter(() => !this.paused)
    )

    this.stateBlade = pane.addMonitor(this, 'status', {
      label: 'Select State',
      interval: 0,
    })

    this.stateContext = {
      interactionEvent$: this.interactionEvent$,
      layerManager: this.layerManager,
      selectLayer: this.selectLayer,
      boundaryLayer: this.boundaryLayer,
      marqueeLayer: this.marqueeLayer,
      selectCache: new Set(),
    }

    this.pause()
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

  public pause() {
    this.paused = true
    this.status = '(paused)'
    this.stateBlade.refresh()
    this.machine?.stop()
    this.selectLayer.removeChildren()
    this.boundaryLayer.clear()
    this.marqueeLayer.clear()
    this.stateContext.selectCache.clear()
    this.stateContext.hoverNode = undefined
  }

  public resume() {
    this.paused = false
    this.status = '(active)'
    this.stateBlade.refresh()

    this.machine = interpret(createSelectToolMachine(this.stateContext))
    this.stateContext.machine = this.machine

    this.machineSignal$ = from(this.machine!).pipe(
      tap(({ value }) => this.statusIndicate(value)),
      tap(({ context }) => this.updateNodesDraw(context)),
    )

    this.machineSignal$.subscribe({
      complete: () => this.editDone(this.stateContext),
    })

    this.machine!.start()
  }

  public updateNodesDraw(context: StateContext) {
    const { layerManager, selectLayer, boundaryLayer } = this
    const { selected } = layerManager
    const { selectCache, hoverNode } = context

    highlightNodes(selectLayer, [...selected, ...selectCache])
    drawSelection(boundaryLayer, [...selected])

    if (hoverNode) {
      const path = new PathNode({
        path: hoverNode.path,
        style: hoverStyle,
      })
      path.draw()
      selectLayer.addChild(path.container)
    }
  }

  public editDone(context: StateContext) {
    this.pause()
    this.parent.plugins.get('VectorTool')?.resume()
  }
}
