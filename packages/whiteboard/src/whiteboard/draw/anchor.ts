import { Renderer, Texture } from '@pixi/core'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Sprite } from '@pixi/sprite'
import { Circle, Rectangle } from '@pixi/math'
import {
  VectorAnchor,
  add,
} from 'vectorial'


export interface AnchorTextures {
  anchor: {
    normal: Texture;
    highlight: Texture;
    selected: Texture;
  };
  handlerPoint: {
    normal: Texture;
    highlight: Texture;
    selected: Texture;
  };
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
      .drawShape(new Circle(0, 0, 3.5)),
    { resolution: 2 },
  )

  const highlightAnchor = renderer.generateTexture(
    new Graphics()
      .beginFill(0xffffff)
      .lineStyle({
        width: 1,
        color: tinyColor,
      })
      .drawShape(new Circle(0, 0, 3.5)),
    { resolution: 2 },
  )

  const selectedAnchor = renderer.generateTexture(
    new Graphics()
      .beginFill(mainColor)
      .lineStyle({
        width: 1,
        color: 0xffffff,
      })
      .drawShape(new Circle(0, 0, 4.5)),
    { resolution: 2 },
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

  const textures = [
    normalAnchor,
    highlightAnchor,
    selectedAnchor,

    normalHandlerPoint,
    highlightHandlerPoint,
    selectedHandlerPoint,
  ]

  textures.forEach(texture => texture.defaultAnchor.set(0.5))

  return {
    anchor: {
      normal: normalAnchor,
      highlight: highlightAnchor,
      selected: selectedAnchor,
    },
    handlerPoint: {
      normal: normalHandlerPoint,
      highlight: highlightHandlerPoint,
      selected: selectedHandlerPoint,
    },
  }
}


export interface AnchorDrawProps {
  vectorAnchor: VectorAnchor;
  renderer?: Renderer;
}

export class AnchorDraw {
  static _textures?: AnchorTextures
  static renderer?: Renderer

  public vectorAnchor: VectorAnchor
  public container: Container
  public anchor?: Sprite
  public inHandler?: Sprite
  public outHandler?: Sprite
  private handlerLine: Graphics

  /**
   * anchor style apply for draw call,
   * if no style, it will be clear
   */
  public style?: {
    anchor?: 'normal' | 'highlight' | 'selected';
    inHandler?: 'normal' | 'highlight' | 'selected';
    outHandler?: 'normal' | 'highlight' | 'selected';
  }

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

  get renderer(): Renderer {
    if (!AnchorDraw.renderer) {
      AnchorDraw.renderer = new Renderer()
    }

    return AnchorDraw.renderer
  }

  set renderer(renderer: Renderer | undefined) {
    if (renderer) {
      AnchorDraw.renderer = renderer
    }
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
    this.drawAnchor(this.textures.anchor.normal)
  }

  public drawHighlightAnchor() {
    this.drawAnchor(this.textures.anchor.highlight)
  }

  public drawSelectedAnchor() {
    this.drawAnchor(this.textures.anchor.selected)
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

    if (!this[handlerType]) {
      this[handlerType] = new Sprite(texture)
      this[handlerType]!.rotation = Math.PI / 4
      this.container.addChild(this[handlerType]!)
    }

    const position = add(vectorAnchor.position, vectorAnchor[handlerType]!)
    this[handlerType]!.position.set(position.x, position.y)
    this[handlerType]!.visible = true
  }

  public drawNormalHandler(direction: HandlerDirection) {
    this.drawHandler(direction, this.textures.handlerPoint.normal)
  }

  public drawHighlightHandler(direction: HandlerDirection) {
    this.drawHandler(direction, this.textures.handlerPoint.highlight)
  }

  public drawSelectedHandler(direction: HandlerDirection) {
    this.drawHandler(direction, this.textures.handlerPoint.selected)
  }

  public drawHandlerLine() {
    const lineColor = 0xb0b0b0
    const { style } = this
    const { x, y } = this.vectorAnchor.position
    const { inHandler, outHandler } = this.vectorAnchor

    this.handlerLine.clear()
    this.handlerLine
      .lineStyle({
        width: 1,
        color: lineColor,
      })

    if (inHandler && style?.inHandler) {
      this.handlerLine
        .moveTo(x, y)
        .lineTo(inHandler.x + x, inHandler.y + y)
    }

    if (outHandler && style?.outHandler) {
      this.handlerLine
        .moveTo(x, y)
        .lineTo(outHandler.x + x, outHandler.y + y)
    }
  }

  public clearAnchor() {
    if (this.anchor) {
      this.anchor.visible = false
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

  public draw() {
    const { style, textures } = this
    this.clear()

    if (!style) {
      return
    }
    const { anchor, inHandler, outHandler } = style

    if (anchor) this.drawAnchor(textures.anchor[anchor])
    if (inHandler) this.drawHandler('in', textures.handlerPoint[inHandler])
    if (outHandler) this.drawHandler('out', textures.handlerPoint[outHandler])

    this.drawHandlerLine()
  }

  public clear() {
    this.clearAnchor()
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
