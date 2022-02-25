import type { Renderer, Texture } from '@pixi/core'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Sprite } from '@pixi/sprite'
import { Circle, Rectangle } from '@pixi/math'
import {
  VectorAnchor,
  add,
} from 'vectorial'


export interface AnchorTextures {
  normalAnchor: Texture;
  highlightAnchor: Texture;
  selectedAnchor: Texture;
  normalHandlerPoint: Texture;
  highlightHandlerPoint: Texture;
  selectedHandlerPoint: Texture;
}

export type HandlerDirection = 'in' | 'out'

export const createAnchorTexture = (renderer: Renderer): AnchorTextures => {
  const mainColor = 0x18a0fb
  const tinyColor = 0xc5e4ff

  const normalAnchor = renderer.generateTexture(
    new Graphics()
      .beginFill(0xffffff)
      .lineStyle({
        width: 1,
        color: mainColor,
      })
      .drawShape(new Circle(0, 0, 3))
  )

  const highlightAnchor = renderer.generateTexture(
    new Graphics()
      .beginFill(0xffffff)
      .lineStyle({
        width: 1,
        color: tinyColor,
      })
      .drawShape(new Circle(0, 0, 3))
  )

  const selectedAnchor = renderer.generateTexture(
    new Graphics()
      .beginFill(mainColor)
      .lineStyle({
        width: 1,
        color: 0xffffff,
      })
      .drawShape(new Circle(0, 0, 4))
  )

  const normalHandlerPoint = renderer.generateTexture(
    new Graphics()
      .beginFill(0xffffff)
      .lineStyle({
        width: 1,
        color: mainColor,
      })
      .drawShape(new Rectangle(0, 0, 4, 4))
  )

  const highlightHandlerPoint = renderer.generateTexture(
    new Graphics()
      .beginFill(0xffffff)
      .lineStyle({
        width: 1,
        color: tinyColor,
      })
      .drawShape(new Rectangle(0, 0, 4, 4))
  )

  const selectedHandlerPoint = renderer.generateTexture(
    new Graphics()
      .beginFill(mainColor)
      .lineStyle({
        width: 1,
        color: mainColor,
      })
      .drawShape(new Rectangle(0, 0, 4, 4))
  )

  const textures = {
    normalAnchor,
    highlightAnchor,
    selectedAnchor,

    normalHandlerPoint,
    highlightHandlerPoint,
    selectedHandlerPoint,
  }

  Object.values(textures).forEach(texture => texture.defaultAnchor.set(0.5))

  return textures
}


export interface AnchorDrawProps {
  renderer: Renderer;
  vectorAnchor: VectorAnchor;
}

export class AnchorDraw {
  static _textures?: AnchorTextures
  public renderer: Renderer
  public vectorAnchor: VectorAnchor
  public container: Container
  public anchor?: Sprite
  public inHandler?: Sprite
  public outHandler?: Sprite
  private handlerLine: Graphics

  constructor({ renderer, vectorAnchor }: AnchorDrawProps) {
    this.renderer = renderer
    this.vectorAnchor = vectorAnchor
    this.container = new Container()

    this.handlerLine = new Graphics()
    this.container.addChild(this.handlerLine)
  }

  get textures(): AnchorTextures {
    if (!AnchorDraw._textures) {
      AnchorDraw._textures = createAnchorTexture(this.renderer)
    }

    return AnchorDraw._textures
  }

  public drawAnchor(texture: Texture) {
    const { x, y } = this.vectorAnchor.position

    if (this.anchor && this.anchor.texture !== texture) {
      this.container.removeChild(this.anchor)
      this.anchor.destroy()
      this.anchor = undefined
    }

    if (!this.anchor) {
      this.anchor = new Sprite(texture)
      this.container.addChild(this.anchor)
    }

    this.anchor.position.set(x, y)
    this.anchor.visible = true
  }

  public drawNormalAnchor() {
    this.drawAnchor(this.textures.normalAnchor)
  }

  public drawHighlightAnchor() {
    this.drawAnchor(this.textures.highlightAnchor)
  }

  public drawSelectedAnchor() {
    this.drawAnchor(this.textures.selectedAnchor)
  }

  public drawHandler(direction: HandlerDirection, texture: Texture) {
    const { vectorAnchor } = this
    const handlerType = direction === 'in' ? 'inHandler' : 'outHandler'
    const handler = this[handlerType]

    if (!vectorAnchor[handlerType]) {
      if (handler) {
        this.container.removeChild(handler)
        this[handlerType] = undefined
      }
      return
    }

    if (handler && handler.texture !== texture) {
      this.container.removeChild(handler)
      handler.destroy()
      this[handlerType] = undefined
    }

    if (!handler) {
      this[handlerType] = new Sprite(texture)
      this[handlerType]!.rotation = Math.PI / 4
      this.container.addChild(this[handlerType]!)
    }

    const position = add(vectorAnchor.position, vectorAnchor[handlerType]!)
    this[handlerType]!.position.set(position.x, position.y)
    this[handlerType]!.visible = true
  }

  public drawNormalHandler(direction: HandlerDirection) {
    this.drawHandler(direction, this.textures.normalHandlerPoint)
  }

  public drawHighlightHandler(direction: HandlerDirection) {
    this.drawHandler(direction, this.textures.highlightHandlerPoint)
  }

  public drawSelectedHandler(direction: HandlerDirection) {
    this.drawHandler(direction, this.textures.selectedHandlerPoint)
  }

  public drawHandlerLine() {
    const lineColor = 0xb0b0b0
    const { x, y } = this.vectorAnchor.position
    const { inHandler, outHandler } = this.vectorAnchor

    this.handlerLine.clear()
    this.handlerLine
      .lineStyle({
        width: 1,
        color: lineColor,
      })

    if (inHandler) {
      this.handlerLine
        .moveTo(x, y)
        .lineTo(inHandler.x + x, inHandler.y + y)
    }

    if (outHandler) {
      this.handlerLine
        .moveTo(x, y)
        .lineTo(outHandler.x + x, outHandler.y + y)
    }
  }

  public clearHandler() {
    if (this.inHandler) {
      this.inHandler.visible = false
    }
    if (this.outHandler) {
      this.outHandler.visible = false
    }

    this.handlerLine.clear()
  }

  public clear() {
    if (this.anchor) {
      this.anchor.visible = false
    }
    this.clearHandler()
  }

  public destroy() {
    this.clear()
    this.anchor?.destroy()
    this.inHandler?.destroy()
    this.outHandler?.destroy()
    this.handlerLine.clear()
    this.anchor = undefined
    this.inHandler = undefined
    this.outHandler = undefined
    this.container.destroy()
  }
}
