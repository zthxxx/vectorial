import paper from 'paper'
import { Vector, HandlerType } from './types'
import {
  len,
  add,
  isNear,
  mirrorVector,
  mirrorVectorAngle,
} from './math'

export interface AnchorData {
  position: Vector;
  handlerType: HandlerType;
  inHandler?: Vector;
  outHandler?: Vector;
  radius?: number;
}

export interface VectorAnchorProps {
  position?: Vector;
  handlerType?: HandlerType;

  /**
   * delta position from anchor point to incoming control handle point
   */
  inHandler?: Vector;
  /**
   * delta position from anchor point to outgoing control handle point
   */
  outHandler?: Vector;
  radius?: number;
}

export class VectorAnchor implements AnchorData {
  public segment: paper.Segment
  public handlerType: HandlerType
  /**
   * @TODO point radius in polygen path
   */
  public radius: number = 0

  constructor(props: VectorAnchorProps ) {
    const {
      position: { x, y } = { x: 0, y: 0 },
      handlerType = HandlerType.None,
      inHandler,
      outHandler,
      radius = 0,
    } = props

    this.handlerType = handlerType
    this.radius = radius
    this.segment = new paper.Segment({
      point: new paper.Point(x, y),
      handleIn: inHandler && new paper.Point(inHandler),
      handleOut: outHandler && new paper.Point(outHandler),
    })
  }

  public get position(): Vector {
    const { x, y } = this.segment.point
    return { x, y }
  }

  public set position({ x, y }: Vector) {
    this.segment.point = new paper.Point({ x, y })
  }

  public get inHandler(): Vector | undefined {
    if (this.handlerType === HandlerType.None) return
    const { x, y } = this.segment.handleIn
    if (!x && !y) return
    return { x, y }
  }

  public get outHandler(): Vector | undefined {
    if (this.handlerType === HandlerType.None) return
    const { x, y } = this.segment.handleOut
    if (!x && !y) return
    return { x, y }
  }

  public set inHandler(inHandler: Vector | undefined) {
    if (!inHandler) {
      this.segment.handleIn = new paper.Point(0, 0)
      this.handlerType = this.outHandler ? HandlerType.Free : HandlerType.None
      return
    }

    this.segment.handleIn = new paper.Point(inHandler)

    if (this.handlerType === HandlerType.Mirror) {
      this.segment.handleOut = new paper.Point(mirrorVector(inHandler))
    }

    if (this.handlerType === HandlerType.Align) {
      const inHandlerLen = this.outHandler
        ? len(this.outHandler)
        : len(this.inHandler!)
      this.segment.handleOut = new paper.Point(mirrorVectorAngle(inHandler, inHandlerLen))
    }
  }

  public set outHandler(outHandler: Vector | undefined) {
    if (!outHandler) {
      this.segment.handleOut = new paper.Point(0, 0)
      this.handlerType = this.inHandler ? HandlerType.Free : HandlerType.None
      return
    }
    this.segment.handleOut = new paper.Point(outHandler)

    if (this.handlerType === HandlerType.Mirror) {
      this.segment.handleIn = new paper.Point(mirrorVector(outHandler))
    }

    if (this.handlerType === HandlerType.Align) {
      const inHandlerLen = this.inHandler
        ? len(this.inHandler)
        : len(this.outHandler!)
      this.segment.handleIn = new paper.Point(mirrorVectorAngle(outHandler, inHandlerLen))
    }
  }

  public clone(): VectorAnchor {
    return new VectorAnchor(this.serialize())
  }

  public isAnchorNear(point: Vector, padding?: number): boolean {
    return isNear(point, this.position, padding)
  }

  public isInHandlerNear(point: Vector, padding?: number): boolean {
    return Boolean(this.inHandler && isNear(point, add(this.position, this.inHandler), padding))
  }

  public isOutHandlerNear(point: Vector, padding?: number): boolean {
    return Boolean(this.outHandler && isNear(point, add(this.position, this.outHandler), padding))
  }

  public serialize(): AnchorData {
    return {
      position: { ...this.position },
      handlerType: this.handlerType,
      inHandler: this.inHandler && { ...this.inHandler },
      outHandler: this.outHandler && { ...this.outHandler },
      radius: this.radius,
    }
  }

  static from(anchor: AnchorData): VectorAnchor {
    return new VectorAnchor(anchor)
  }
}
