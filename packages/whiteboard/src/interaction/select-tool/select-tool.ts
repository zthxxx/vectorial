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
  BladeApi,
  ButtonApi,
  FolderApi,
  MonitorBindingApi,
} from 'tweakpane'
import type {
  TpButtonGridEvent,
} from '@tweakpane/plugin-essentials/dist/types/button-grid/api/tp-button-grid-event'
import {
  interpret,
  State,
  StateValue,
} from 'xstate'
import type { LayerManager } from '../layer'
import {
  PathNode,
  ShapeNode,
  DefaultPathColor,
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
  MouseEvent,
  StateEvent,
  StateContext,
  SelectToolService,
} from './types'
import {
  Toolbox,
  ToolType,
} from '../toolbox'
import {
  VectorAnchor,
  VectorPath,
  VectorShape,
  HandlerType,
} from 'vectorial'

export interface SelectToolProps {
  toolbox: Toolbox;
  pane: FolderApi;
  layerManager: LayerManager;
  interactionEvent$: Observable<InteractionEvent>;
}

const booleanMethods = [
  ['Unite', 'Subtract'],
  ['Intersect', 'Exclude'],
]

type BooleanOperator = 'unite' | 'intersect' | 'subtract' | 'exclude'

export class SelectTool extends Plugin {
  public status: string = ''
  private toolbox: Toolbox
  private stateBlade: MonitorBindingApi<string>
  private booleanButton!: ButtonApi
  private selectLayer: Container
  private boundaryLayer: Graphics
  private marqueeLayer: Graphics
  private layerManager: LayerManager
  private interactionEvent$: Observable<InteractionEvent>

  private machine?: SelectToolService
  private stateContext: StateContext
  public machineSignal$?: Observable<State<StateContext, StateEvent>>

  constructor(parent: Viewport, props: SelectToolProps) {
    const {
      pane,
      toolbox,
      layerManager,
      interactionEvent$,
    } = props
    super(parent)

    this.toolbox = toolbox

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

    /**
     * @TODO temporary need be remove
     */
    this.booleanButton = pane.addBlade({
      view: 'buttongrid',
      size: [2, 2],
      cells: (x: number, y: number) => ({
        title: [
          ['Unite', 'Subtract'],
          ['Intersect', 'Exclude'],
        ][y][x],
      }),
      label: 'Boolean',
    }) as ButtonApi

    this.stateContext = {
      interactionEvent$: this.interactionEvent$,
      layerManager: this.layerManager,
      selectLayer: this.selectLayer,
      boundaryLayer: this.boundaryLayer,
      marqueeLayer: this.marqueeLayer,
      selectCache: new Set(),
    }

    this.pause()
    this.setupBooleanOperator()
  }

  public setupBooleanOperator() {
    this.booleanButton.on('click', (ev: TpButtonGridEvent) => {
      const method = booleanMethods[ev.index[1]][ev.index[0]].toLocaleLowerCase()
      const { selected } = this.layerManager
      if (selected.size < 2) return
      const nodes = this.layerManager.filter(node => selected.has(node))
      this.booleanOperate(method as BooleanOperator, nodes)
    })
  }

  /**
   * @TODO temporary need be remove
   */
  public booleanOperate(operator: BooleanOperator, selected: PathNode[]) {
    selected.forEach(node => node.clear())

    const shapeNode = new ShapeNode({
      style: selected.at(-1)?.style,
      shape: new VectorShape({
        booleanOperation: operator,
        children: selected.map(node => node.path),
      })
    })
    shapeNode.draw()

    this.layerManager.nodesLayer.addChild(shapeNode.container)
    this.interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      tap((event: MouseEvent) => {
        const hit = shapeNode.shape.hitPathTest(event.mouse)

        if (hit) {
        }
      }),
    ).subscribe()
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
      complete: () => this.editDone(),
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

  /**
   * only enter to `editVector` mode will call `editDone`
   */
  public editDone() {
    if (!this.paused) {
      this.pause()
      this.toolbox.switchToolByName(ToolType.VectorTool)
    }
  }
}
