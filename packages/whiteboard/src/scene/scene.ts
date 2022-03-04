import type { Renderer } from '@pixi/core'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import {
  PageNode,
} from '@vectorial/whiteboard/nodes'
import { Application } from './pixi'


export interface SceneProps {
  element: HTMLElement;
  page: PageNode;
}

/**
 * document renderer,
 * using pixi.js render nodes after load page,
 * control the viewport by view matrix
 */
export class Scene {
  public element: HTMLElement
  public app: Application & { renderer: Renderer }
  public viewport: Container
  /** interactLayer nodes will be move but not scale */
  public interactLayer: Container
  public usersLayer: Container
  public page: PageNode;

  constructor(props: SceneProps) {
    const {
      element,
      page,
    } = props

    this.element = element
    this.page = page

    this.app = new Application({
      resizeTo: this.element,
      resolution: window.devicePixelRatio,
      backgroundAlpha: 0.1,
      antialias: true,
      autoDensity: true,
    }) as Application & { renderer: Renderer }

    this.viewport = new Container()
    this.interactLayer = new Container()
    this.usersLayer = new Container()

    // append canvas dom into container
    this.element.appendChild(this.app.view)
    this.app.stage.addChild(this.viewport)
    this.app.stage.addChild(this.interactLayer)
    this.interactLayer.addChild(this.usersLayer)

    this.viewport.addChild(this.page.container)
  }

  public get canvas(): HTMLCanvasElement {
    return this.app.view
  }

  public setCursor(icon?: string) {
    this.element.style.cursor = icon ? `url('${icon}'), auto` : `default`
  }

  public destroy() {
    this.element.removeChild(this.app.view)
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
  }
}
