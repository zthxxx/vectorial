import * as Y from 'yjs'
import type { Renderer } from '@pixi/core'
import { Container } from '@pixi/display'
import {
  Subject,
  BehaviorSubject,
} from 'rxjs'
import {
  tap,
  debounceTime,
} from 'rxjs/operators'
import { Awareness } from 'y-protocols/awareness'
import {
  Matrix,
  Rect,
  identityMatrix,
} from 'vectorial'
import {
  onChange,
} from '@vectorial/whiteboard/utils'
import {
  NodeType,
} from '@vectorial/whiteboard/model'
import {
  PageNode,
  SceneNode,
  BooleanOperationNode,
  VectorNode,
} from '@vectorial/whiteboard/nodes'
import {
  arrow,
} from '@vectorial/whiteboard/assets/cursor'
import { Application } from './pixi'
import {
  fromPixiMatrix,
  toPixiMatrix,
} from './utils'
import {
  EventManager,
  InteractEvent,
} from './event'
import {
  ScenePlugin,
} from './plugins'


export type SelectedNodes = Set<SceneNode>

export interface ScenePlugins {
  [name: ScenePlugin['name']]: ScenePlugin | undefined;
}

export interface SceneProps {
  element: HTMLElement;
  page: PageNode;
  awareness: Awareness;
  docTransact: Y.Doc['transact'];
}

/**
 * document renderer,
 * using pixi.js render nodes after load page,
 * control the viewport by view matrix
 */
export class Scene {
  public element: HTMLElement
  public app: Application & { renderer: Renderer }
  public page: PageNode;
  public awareness: Awareness
  public docTransact: Y.Doc['transact']
  public undoManager: Y.UndoManager
  public eventManager: EventManager

  public viewport: Container
  /** interactLayer nodes will be move but not scale */
  public interactLayer: Container
  public usersLayer: Container

  protected _lastCursor: string | undefined
  protected _scale: number
  protected _hasUpdate: boolean = false

  public events = {
    interactEvent$: new Subject<InteractEvent>(),
    viewMatrix$: new BehaviorSubject<Matrix>(identityMatrix()),
    marquee$: new Subject<Rect | undefined>(),
    scale$: new Subject<number>(),
    selected$: new Subject<SelectedNodes>(),
    hovered$: new Subject<SceneNode | undefined>(),
  }

  public plugins: ScenePlugins = {}

  constructor(props: SceneProps) {
    const {
      element,
      page,
      docTransact,
      awareness,
    } = props

    this.element = element
    this.page = page
    this.awareness = awareness
    this.docTransact = docTransact
    this.undoManager = new Y.UndoManager(page.binding)

    this.app = new Application({
      resizeTo: this.element,
      resolution: window.devicePixelRatio,
      backgroundAlpha: 0.1,
      antialias: true,
      autoDensity: true,
      autoStart: false,
    }) as Application & { renderer: Renderer }

    this.viewport = this.page.container
    this._scale = 1
    this.interactLayer = new Container()
    this.usersLayer = new Container()

    // append canvas dom into container
    this.element.appendChild(this.app.view)
    this.app.stage.addChild(this.viewport)
    this.app.stage.addChild(this.interactLayer)
    this.interactLayer.addChild(this.usersLayer)

    this.eventManager = new EventManager({
      element,
      scene: this,
    })
    this.events.interactEvent$ = this.eventManager.interactEvent$

    this.setCursor({ icon: arrow })

    this.setupReactivity()
  }

  public destroy() {
    this.element.removeChild(this.app.view)
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
  }

  public get canvas(): HTMLCanvasElement {
    return this.app.view
  }

  public getCursor(): string {
    return this.element.style.cursor
  }

  public setCursor({ icon, state }: {
    icon?: string,
    state?: string,
  }) {
    const cursor = icon
      ? `url('${icon}'), auto`
      : state ?? (this._lastCursor || 'default')
    this._lastCursor = this.element.style.cursor
    this.element.style.cursor = cursor
  }

  public get viewMatrix(): Matrix {
    return fromPixiMatrix(this.viewport.transform.localTransform)
  }

  public set viewMatrix(matrix: Matrix) {
    this.viewport.transform.setFromMatrix(toPixiMatrix(matrix))
    this.viewport.transform.updateLocalTransform()

    this.events.viewMatrix$.next(matrix)
    this.scale = this.viewport.transform.scale.x
    this.update()
  }

  @onChange(function(scale) {
    this.events.scale$.next(scale)
  })
  accessor scale: number = 1

  @onChange(function(marquee) {
    this.events.marquee$.next(marquee)
  })
  accessor marquee: Rect | undefined

  @onChange(function(selected) {
    this.events.selected$.next(selected)
  })
  accessor selected: SelectedNodes = new Set()

  @onChange(function(hovered) {
    this.events.hovered$.next(hovered)
  })
  accessor hovered: SceneNode | undefined

  private redrawVector = () => {
    Object.values(this.page.nodes)
      .filter(node => (
        node.type === NodeType.Vector
        || node.type === NodeType.BooleanOperation
      ))
      .forEach((node: VectorNode | BooleanOperationNode) => {
        node._sceneScale = this.scale
        node.draw()
      })
  }

  public use(plugin: ScenePlugin) {
    this.plugins[plugin.name] = plugin
  }

  public activate(pluginName: string) {
    const plugin = this.plugins[pluginName]
    if (plugin && !plugin.isActive) {
      plugin.activate()
    }
  }

  public deactivate(pluginName: string) {
    const plugin = this.plugins[pluginName]
    if (plugin && plugin.isActive) {
      plugin.deactivate()
    }
  }

  public update = () => {
    if (this._hasUpdate) return
    this._hasUpdate = true
    requestAnimationFrame(this.render)
  }

  protected render = () => {
    if (!this._hasUpdate) return
    this.app.render()
    this._hasUpdate = false
  }

  protected setupReactivity() {
    this.events.scale$.pipe(
      debounceTime(200),
      tap(this.redrawVector),
      tap(this.update),
    ).subscribe()

    this.events.viewMatrix$.subscribe(this.update)

    this.page.binding.observeDeep(this.update)
  }
}
