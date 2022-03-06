import { ReactElement } from 'react'
import { Container } from '@pixi/display'
import * as Y from 'yjs'
import { Subject, Observable, from } from 'rxjs'
import {
  filter,
  tap,
  map,
  takeUntil,
} from 'rxjs/operators'
import {
  interpret,
  State,
} from 'xstate'
import {
  Vector,
  VectorPath,
  VectorAnchor,
  HitResult,
} from 'vectorial'
import {
  Pen,
} from '@vectorial/whiteboard/assets/icon'
import {
  InteractEvent,
  Scene,
  EventKeyMatch,
} from '@vectorial/whiteboard/scene'
import {
  NodeType,
  newVectorNode,
} from '@vectorial/whiteboard/model'
import {
  toSharedTypes,
} from '@vectorial/whiteboard/utils'
import {
  ParentNode,
  VectorNode,
} from '@vectorial/whiteboard/nodes'
import {
  ToolDefine,
  ToolProps,
} from '../types'
import {
  AnchorNode,
  PathNode,
  DefaultPathColor,
} from '@vectorial/whiteboard/scene/plugins'
import {
  createVectorToolMachine,
} from './state-machine'
import {
  StateEvent,
  StateContext,
  VectorToolService,
} from './types'
import { applyToLocalEvent } from './utils'


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


export class VectorTool extends ToolDefine {
  public name: string = 'VectorTool'
  public label: string = 'Vector Pen'
  public hotkey: EventKeyMatch = {
    modifiers: [],
    keys: ['KeyP'],
    mouse: [],
  }
  public hotkeyLabel: string = 'P'

  public interactEvent$: Observable<InteractEvent>
  public lastMousePosition: Vector

  public vectorNode?: VectorNode
  public toolLayer?: ToolLayer

  constructor(props: ToolProps) {
    super(props)
    const { scene } = props
    const { interactEvent$ } = scene.events

    this.lastMousePosition = {
      x: -10000,
      y: -10000,
    }

    interactEvent$.subscribe(event => {
      if (event.lastMouse) {
        const { x, y } = event.lastMouse
        this.lastMousePosition.x = x
        this.lastMousePosition.y = y
      }
    })

    this.interactEvent$ = interactEvent$.pipe(
      filter(() => this.isActive),
    )
  }

  public get icon(): ReactElement | null {
    return (
      <Pen className='w-6 h-6' />
    )
  }

  public getSelectedPath(): VectorNode | undefined {
    const node = [...this.scene.selected].find(node => node.type === NodeType.Vector) as VectorNode
    return node
  }

  public getFirstOfParent(): ParentNode | undefined {
    const node = [...this.scene.selected].find(() => true)
    const parent = (this.scene.selected.size === 1 && node && 'children' in node)
      ? node
      : this.scene.page.get(node?.parent)
    return parent as ParentNode
  }


  public setSelectedPath(): void {
    if (this.isActive) {
      throw new Error('Cannot set path node while tool is running')
    }
    this.vectorNode = this.getSelectedPath()
    if (this.vectorNode) return

    const { scene } = this
    const path = newVectorNode()

    scene.docTransact(() => {
      const binding = toSharedTypes(path)
      scene.page.binding.get('nodes')!.set(path.id, binding)

      this.vectorNode = new VectorNode({
        ...path,
        binding,
        page: scene.page,
      })

      const parent = this.getFirstOfParent() ?? scene.page
      scene.page.insert(
        this.vectorNode,
        parent,
      )
      scene.selected = new Set([this.vectorNode])
    })

  }

  public activate() {
    this.setSelectedPath()
    this.isActive = true
    this.scene.plugins['HighlightSelectedPlugin']?.deactivate()

    this.toolLayer = new ToolLayer({
      scene: this.scene,
      interactEvent$: this.interactEvent$,
      vectorNode: this.vectorNode!,
      lastMousePosition: this.lastMousePosition,
    })

    this.toolLayer.machineSignal$.subscribe({
      complete: () => this.editDone(),
    })
  }

  public deactivate() {
    const { scene } = this
    this.isActive = false
    this.toolLayer?.machine.stop()
    this.toolLayer?.destroy()
    this.toolLayer = undefined
    this.scene.plugins['HighlightSelectedPlugin']?.activate()
    if (this.vectorNode) {
      if (this.vectorNode.vectorPath.anchors.length < 2) {
        scene.selected = new Set()
        scene.page.delete(this.vectorNode.id)
      } else {
        scene.selected = new Set([this.vectorNode])
      }
      this.vectorNode.draw()
    }
    this.vectorNode = undefined
  }

  public editDone(): void {
    if (this.isActive) {
      this.deactivate()
      this.switchTool('SelectTool')
    }
  }
}


interface ToolLayerProps {
  scene: Scene;
  interactEvent$: Observable<InteractEvent>;
  lastMousePosition: Vector;
  vectorNode: VectorNode;
}

export class ToolLayer {
  public container: Container

  public scene: Scene
  public interactEvent$: Subject<InteractEvent>
  public machine: VectorToolService

  public vectorNode: VectorNode
  public vectorPath: VectorPath
  public pathNode: PathNode
  public anchorNodes: Map<VectorAnchor, AnchorNode>
  public indicativeAnchor: AnchorNode
  public indicativePath: PathNode
  public lastMousePosition: Vector
  public anchorNodesLayer: Container
  public selected: HitResult[] = []
  public changes: Array<
    | [AnchorNode | undefined, AnchorNode['style']]
    | [PathNode | undefined, PathNode['style']]
  > = []
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

  public doneSignal$: Subject<void>
  public machineSignal$: Observable<State<StateContext, StateEvent>>

  constructor(props: ToolLayerProps) {
    const {
      scene,
      interactEvent$,
      vectorNode,
      lastMousePosition,
    } = props
    this.scene = scene
    this.vectorNode = vectorNode
    this.container = new Container()
    this.scene.interactLayer.addChild(this.container)

    this.vectorPath = this.vectorNode.vectorPath
    this.pathNode = new PathNode({
      path: this.vectorPath,
      style: {
        strokeWidth: 2,
        strokeColor: DefaultPathColor.normal,
      },
      absoluteTransform: vectorNode.absoluteTransform,
      viewMatrix$: scene.events.viewMatrix$,
    })

    this.lastMousePosition = lastMousePosition

    this.doneSignal$ = new Subject()
    this.interactEvent$ = new Subject()

    interactEvent$.pipe(
      takeUntil(this.doneSignal$),
      map(event => applyToLocalEvent(event, this.vectorNode.absoluteTransform)),
      /**
       * this link for `this.interactEvent$`
       * due to we want to reduce multiple executing of `applyToLocalEvent` in every forked pipe
       */
      tap(event => this.interactEvent$.next(event)),
    ).subscribe()

    this.indicativeAnchor = new AnchorNode({
      vectorAnchor: new VectorAnchor(lastMousePosition),
      absoluteTransform: vectorNode.absoluteTransform,
      viewMatrix$: scene.events.viewMatrix$,
    })
    this.indicativePath = new PathNode({
      path: new VectorPath(),
      style: {
        strokeWidth: 2,
        strokeColor: DefaultPathColor.highlight,
      },
      absoluteTransform: vectorNode.absoluteTransform,
      viewMatrix$: scene.events.viewMatrix$,
    })

    this.anchorNodesLayer = new Container()
    this.anchorNodes = new DrawsMap(
      this.vectorPath.anchors.map(vectorAnchor => [
        vectorAnchor,
        new AnchorNode({
          vectorAnchor,
          style: { anchor: 'normal' },
          absoluteTransform: vectorNode.absoluteTransform,
          viewMatrix$: scene.events.viewMatrix$,
        }),
      ]),
      this.anchorNodesLayer,
    )

    for (const anchor of this.anchorNodes.values()) { anchor.draw() }

    this.container.addChild(this.pathNode.container)
    this.container.addChild(this.indicativePath.container)
    this.container.addChild(this.anchorNodesLayer)
    this.container.addChild(this.indicativeAnchor.container)

    this.machine = interpret(createVectorToolMachine(this))

    this.machineSignal$ = from(this.machine).pipe(
      tap(({ context }) => this.drawChanges(context)),
      tap((state) => {
        if (state.done) {
          this.doneSignal$.next()
        }
      })
    )

    this.startMachine()

    /**
     * @TODO ugly now, should be more accurate
     */
    this.vectorNode.binding.observeDeep(this.bindingUpdate)
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
    this.scene.interactLayer.removeChild(this.container)
    this.pathNode.destroy()
    this.indicativeAnchor.destroy()
    this.indicativePath.destroy()
    this.anchorNodes.forEach(anchor => anchor.destroy())
    this.container.destroy({ children: true })
    this.vectorNode.binding.unobserveDeep(this.bindingUpdate)
  }

  public bindingUpdate = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {

    /**
     * we are not set origin in transact manually,
     * so origin will be null in local client, but be Room from remote
     */
    if (!transaction.origin) return
    this.load()
  }

  public load() {
    const {
      vectorNode,
      scene,
    } = this
    this.pathNode.destroy()

    this.container.removeChild(this.pathNode.container)
    this.pathNode = new PathNode({
      path: this.vectorPath,
      style: {
        strokeWidth: 2,
        strokeColor: DefaultPathColor.normal,
      },
      absoluteTransform: vectorNode.absoluteTransform,
      viewMatrix$: scene.events.viewMatrix$,
    })
    this.container.addChild(this.pathNode.container)

    this.container.removeChild(this.indicativeAnchor.container)
    this.indicativeAnchor.destroy()
    this.indicativeAnchor = new AnchorNode({
      vectorAnchor: new VectorAnchor(this.lastMousePosition),
      absoluteTransform: vectorNode.absoluteTransform,
      viewMatrix$: scene.events.viewMatrix$,
    })
    this.container.addChild(this.indicativeAnchor.container)

    this.container.removeChild(this.indicativePath.container)
    this.indicativePath.destroy()
    this.indicativePath = new PathNode({
      path: new VectorPath(),
      style: {
        strokeWidth: 2,
        strokeColor: DefaultPathColor.highlight,
      },
      absoluteTransform: vectorNode.absoluteTransform,
      viewMatrix$: scene.events.viewMatrix$,
    })
    this.container.addChild(this.indicativePath.container)

    this.anchorNodesLayer.removeChildren()
    const originAnchorNodes = this.anchorNodes
    this.anchorNodes = new DrawsMap(
      this.vectorPath.anchors.map(vectorAnchor => [
        vectorAnchor,
        new AnchorNode({
          vectorAnchor,
          style: this.anchorNodes.get(vectorAnchor)?.style ?? { anchor: 'normal' },
          absoluteTransform: vectorNode.absoluteTransform,
          viewMatrix$: scene.events.viewMatrix$,
        }),
      ]),
      this.anchorNodesLayer,
    )

    {
      [...originAnchorNodes.values()].forEach(anchor => anchor.destroy())
    }
  }
}
