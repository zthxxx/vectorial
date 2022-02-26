import type paper from 'paper'
import {
  Point as PaperPoint,
  Segment as PaperSegment,
} from 'paper'
import { Vector, HandlerType } from './types'
import {
  len,
  mirrorVector,
  mirrorVectorAngle,
} from './math'

export class VectorAnchor {
  public segment: paper.Segment
  public handlerType: HandlerType = HandlerType.None
  public radius: number = 0

  constructor(
    { x, y }: Vector = { x: 0, y: 0 },
    handlerType: HandlerType = HandlerType.None,
    /**
     * delta position from anchor point to 'incoming' / 'outgoing' control handle point
     */
    { inHandler, outHandler }: { inHandler?: Vector, outHandler?: Vector } = {},
    radius: number = 0,
  ) {
    this.handlerType = handlerType
    this.radius = radius
    this.segment = new PaperSegment({
      point: new PaperPoint(x, y),
      handleIn: inHandler && new PaperPoint(inHandler),
      handleOut: outHandler && new PaperPoint(outHandler),
    })
  }

  public get position(): Vector {
    const { x, y } = this.segment.point
    return { x, y }
  }

  public set position({ x, y }: Vector) {
    this.segment.point = new PaperPoint({ x, y })
  }

  public get inHandler(): Vector | undefined {
    const { x, y } = this.segment.handleIn
    if (!x && !y) return
    return { x, y }
  }

  public get outHandler(): Vector | undefined {
    const { x, y } = this.segment.handleOut
    if (!x && !y) return
    return { x, y }
  }

  public set inHandler(inHandler: Vector | undefined) {
    if (!inHandler) {
      this.segment.handleIn = new PaperPoint(0, 0)
      this.handlerType = this.outHandler ? HandlerType.Free : HandlerType.None
      return
    }

    this.segment.handleIn = new PaperPoint(inHandler)

    if (this.handlerType === HandlerType.Mirror) {
      this.segment.handleOut = new PaperPoint(mirrorVector(inHandler))
    }

    if (this.handlerType === HandlerType.Align) {
      const inHandlerLen = this.outHandler
        ? len(this.outHandler)
        : len(this.inHandler!)
      this.segment.handleOut = new PaperPoint(mirrorVectorAngle(inHandler, inHandlerLen))
    }
  }

  public set outHandler(outHandler: Vector | undefined) {
    if (!outHandler) {
      this.segment.handleOut = new PaperPoint(0, 0)
      this.handlerType = this.inHandler ? HandlerType.Free : HandlerType.None
      return
    }
    this.segment.handleOut = new PaperPoint(outHandler)

    if (this.handlerType === HandlerType.Mirror) {
      this.segment.handleIn = new PaperPoint(mirrorVector(outHandler))
    }

    if (this.handlerType === HandlerType.Align) {
      const inHandlerLen = this.inHandler
        ? len(this.inHandler)
        : len(this.outHandler!)
      this.segment.handleIn = new PaperPoint(mirrorVectorAngle(outHandler, inHandlerLen))
    }
  }

  public clone(): VectorAnchor {
    return new VectorAnchor(
      this.position,
      this.handlerType,
      {
        inHandler: this.inHandler,
        outHandler: this.outHandler,
      },
      this.radius,
    )
  }
}
