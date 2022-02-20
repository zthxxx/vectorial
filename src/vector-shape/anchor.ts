import { Vector, HandlerType } from './types'
import { add, len, mirrorVector, mirrorVectorAngle } from './math'

export class VectorAnchor {
  public position: Vector
  public handlerType: HandlerType = HandlerType.None

  /**
   * delta position from anchor point to ‘incoming' control handle point
   */
  public inHandler: Vector | undefined
  /**
   * delta position from anchor point to ‘outgoing’ control handle point
   */
  public outHandler: Vector | undefined
  public radius: number = 0

  constructor(
    { x, y }: Vector = { x: 0, y: 0 },
    handlerType: HandlerType = HandlerType.None,
    { inHandler, outHandler }: { inHandler?: Vector, outHandler?: Vector } = {},
    radius: number = 0,
  ) {
    this.position = { x, y }
    this.handlerType = handlerType
    this.inHandler = inHandler
    this.outHandler = outHandler
    this.radius = radius
  }

  public setPositon({ x, y }: Vector) {
    this.position = { x, y }
  }

  public setInHandler(inHandler: Vector) {
    this.inHandler = inHandler

    if (this.handlerType === HandlerType.Mirror) {
      this.outHandler = mirrorVector(inHandler)
    }

    if (this.handlerType === HandlerType.MirrorAngle) {
      const inHandlerLen = this.outHandler
        ? len(this.outHandler)
        : len(this.inHandler)
      this.outHandler = mirrorVectorAngle(inHandler, inHandlerLen)
    }
  }

  public setOutHandler(outHandler: Vector) {
    this.outHandler = outHandler

    if (this.handlerType === HandlerType.Mirror) {
      this.inHandler = mirrorVector(outHandler)
    }

    if (this.handlerType === HandlerType.MirrorAngle) {
      const inHandlerLen = this.inHandler
        ? len(this.inHandler)
        : len(this.outHandler)
      this.inHandler = mirrorVectorAngle(outHandler, inHandlerLen)
    }
  }

  public moveInHandler(delta: Vector) {
    const { inHandler, position } = this

    this.setInHandler(add(inHandler ?? position, delta))
  }

  public moveOutHandler(delta: Vector) {
    const { outHandler, position } = this

    this.setInHandler(add(outHandler ?? position, delta))
  }
}
