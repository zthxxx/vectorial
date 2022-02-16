
import type { Renderer } from '@pixi/core'
import { Viewport as PixiViewport } from 'pixi-viewport'
import { Application } from './application'

export interface ViewportProps {
  container: HTMLElement;
}

export class Viewport {
  public container: HTMLElement
  public app: Application & { renderer: Renderer }
  public viewport: PixiViewport
  public resizeObserver: ResizeObserver

  constructor(props: ViewportProps) {
    const {
      container,
    } = props

    this.container = container

    this.app = new Application({
      resizeTo: this.container,
      resolution: window.devicePixelRatio,
      transparent: true,
      antialias: true,
      autoDensity: true,
    }) as Application & { renderer: Renderer }

    // append canvas dom into container
    this.container.appendChild(this.app.view)

    // https://davidfig.github.io/pixi-viewport/
    this.viewport = new PixiViewport({
      screenWidth: this.container.clientWidth,
      screenHeight: this.container.clientHeight,
      interaction: this.app.renderer.plugins.interaction,
      passiveWheel: false,
      stopPropagation: true,
      disableOnContextMenu: true,
      divWheel: this.container,
    })

    this.app.stage.addChild(this.viewport)

    this.resizeObserver = new ResizeObserver(() => {
      this.app.resize()
      this.viewport.resize(this.container.clientWidth, this.container.clientHeight)
    })
    this.resizeObserver.observe(this.container)
  }

  public get canvas(): HTMLCanvasElement {
    return this.app.view
  }

  public destroy() {
    this.resizeObserver.disconnect()
    this.container.removeChild(this.app.view)
    this.viewport.destroy()
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
  }
}
