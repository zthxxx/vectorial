import * as Y from 'yjs'
import type { Renderer } from '@pixi/core'
import { Container } from '@pixi/display'
import { Observable, Subject } from 'rxjs'
import { Awareness } from 'y-protocols/awareness'
import {
  Matrix,
} from 'vectorial'
import {
  PageNode,
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

  public viewport: Container
  public viewMatrix$: Subject<Matrix> = new Subject()
  /** interactLayer nodes will be move but not scale */
  public interactLayer: Container
  public usersLayer: Container
  public eventManager: EventManager;
  public interactEvent$: Observable<InteractEvent>;
  public _lastCursor: string | undefined;

  public plugins: { [name: ScenePlugin['name']]: ScenePlugin } = {};

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
    }) as Application & { renderer: Renderer }

    this.viewport = this.page.container
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
    this.interactEvent$ = this.eventManager.interactEvent$

    this.setCursor({ icon: arrow })
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
    this.viewMatrix$.next(matrix)
  }

  public use(plugin: ScenePlugin) {
    this.plugins[plugin.name] = plugin
  }

  public activate(pluginName: string) {
    const plugin = this.plugins[pluginName]
    if (plugin && !plugin.isActive) {
      this.plugins[pluginName].activate()
    }
  }

  public deactivate(pluginName: string) {
    const plugin = this.plugins[pluginName]
    if (plugin && plugin.isActive) {
      this.plugins[pluginName].deactivate()
    }
  }
}