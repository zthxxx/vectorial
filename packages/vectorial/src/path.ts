import paper from 'paper'
import type { Vector, Matrix, Rect } from './types'
import { VectorAnchor } from './anchor'
import {
  add,
  emptyVector,
  toTranslation,
  toRotation,
  toScale,
  multiply,
  identityMatrix,
  applyInverse,
  applyMatrix,
} from './math'


export enum PathHitType {
  Anchor = 'Anchor',
  InHandler = 'InHandler',
  OutHandler = 'OutHandler',
  Stroke = 'Stroke',
  Fill = 'Fill',
  Compound = 'Compound',
}

export type PathHitResult =
  | {
    type: PathHitType.Anchor | PathHitType.InHandler | PathHitType.OutHandler;
    point: VectorAnchor;
    ends: [VectorAnchor, VectorAnchor];
  }
  | {
    type: PathHitType.Stroke;
    point: VectorAnchor;
    ends: [VectorAnchor, VectorAnchor];
    /** bezier curve parameter t, range: 0-1*/
    t: number;
    curveIndex: number;
  }
  | {
    type: PathHitType.Fill;
  }
  | {
    type: PathHitType.Compound;
  }

export class VectorPathProps {
  anchors?: VectorAnchor[];
  closed?: boolean;
  position?: Vector;
  /** degrees */
  rotation?: number;
  resizing?: Vector;
  /**
   * partiy of path area used for evenodd fill rule, of which,
   *    1: odd (fill)
   *    0: even (not fill)
   */
  parity?: 1 | 0;
}

export class VectorPath {
  public _position: Vector;
  /**
   * euler rotation degree,
   * rotation point is the center of the self
   */
  public _rotation: number;
  /**
   * resizing scale from left-top corner
   */
  public _resizing: Vector;
  public path: paper.Path

  /**
   * partiy of path area used for evenodd fill rule, of which,
   *    1: odd (fill)
   *    0: even (not fill)
   */
  public parity?: 1 | 0;
  public segmentMap: Map<paper.Segment, VectorAnchor>
  private _anchors: VectorAnchor[] = []
  private _closed: boolean = false
  private _relativeMatrix: Matrix

  constructor({
    anchors = [],
    closed = false,
    position = emptyVector(),
    rotation = 0,
    resizing = { x: 1, y: 1 },
    parity = 1,
  }: VectorPathProps = {}) {
    this._anchors = anchors
    this._closed = closed
    this.parity = parity

    this._relativeMatrix = identityMatrix()

    this._position = position
    this._rotation = rotation
    this._resizing = resizing

    this.path = new paper.Path({
      segments: anchors.map(anchor => anchor.segment),
      /**
       * stroke and fill style only for hitTest interaction
       * strokeWidth is how near can hit while mouse close to path
       */
      strokeWidth: 10,
      strokeColor: new paper.Color(0x000),
      fillColor: new paper.Color(0x000),
      fillRule: 'evenodd',
    })
    this.path.closed = closed
    this.segmentMap = new Map(anchors.map(anchor => [anchor.segment, anchor]))
  }

  public set anchors(anchors: (VectorAnchor | undefined)[]) {
    this.clear()
    anchors
      .filter(Boolean)
      .forEach(anchor => this.addAnchor(anchor!))
  }

  public get closed(): boolean {
    return this._closed
  }

  public set closed(closed: boolean) {
    this._closed = closed
    this.path.closed = closed
  }

  public get bounds(): Rect {
    return this.path.bounds
  }

  public get center(): Vector {
    return this.path.bounds.center
  }

  public get width(): number {
    return this.bounds.width
  }

  public get height(): number {
    return this.bounds.height
  }

  public get anchors(): Array<VectorAnchor> {
    return this._anchors
  }

  public get relativeMatrix(): Matrix {
    return this._relativeMatrix
  }

  private updateRelativeMatrix() {
    this._relativeMatrix = multiply(
      toTranslation(this.position.x, this.position.y),
      toRotation(this.rotation),
      toScale(this.resizing.x, this.resizing.y),
    )
  }

  public get position(): Vector {
    return this._position
  }

  public set position({ x, y }: Vector) {
    this._position = { x, y }
    this.updateRelativeMatrix()
  }

  public get rotation(): number {
    return this._rotation
  }

  public set rotation(degree: number) {
    this._rotation = degree
    this.updateRelativeMatrix()
  }

  public get resizing(): Vector {
    return this._resizing
  }

  public set resizing({ x, y }: Vector) {
    this._resizing = { x, y }
    this.updateRelativeMatrix()
  }

  public addAnchor(anchor: VectorAnchor) {
    this.addAnchorAt(anchor)
  }

  public addAnchorAt(anchor: VectorAnchor, insertIndex?: number) {
    const { length } = this.anchors
    const index = insertIndex ?? length

    this.anchors.splice(index, 0, anchor)
    this.path.insert(index, anchor.segment)
    this.segmentMap.set(anchor.segment, anchor)
  }

  public removeAnchor(anchor: VectorAnchor) {
    const index = this.anchors.indexOf(anchor)
    if (index === -1) return
    this.removeAnchorAt(index)
  }

  public removeAnchorAt(index: number) {
    const anchor = this.anchors[index]
    if (!anchor) return
    this.anchors.splice(index, 1)
    this.path.removeSegment(index)
    this.segmentMap.delete(anchor.segment)
  }

  public clear() {
    this.segmentMap.clear()
    this.path.removeSegments()
    this.closed = false
    this._anchors = []
  }

  public clone(): VectorPath {
    return new VectorPath({
      anchors: this.anchors,
      closed: this.closed,
      position: { ...this.position },
      resizing: { ...this.resizing },
      rotation: this.rotation,
      parity: this.parity,
    })
  }

  /**
   * @param point - parent coordinate position
   * @returns point - local coordinate position
   */
  public toLocalPoint(point: Vector): Vector {
    return applyInverse(point, this.relativeMatrix)
  }


  /**
   * @param point - local coordinate position
   * @returns point - parent view coordinate position
   */
   public toParentPoint(point: Vector): Vector {
    return applyMatrix(point, this.relativeMatrix)
  }

  public hitAnchorTest(viewPoint: Vector): PathHitResult | undefined {
    const point = this.toLocalPoint(viewPoint)
    const { closed } = this
    const first = this.anchors.at(0)
    const last = this.anchors.at(-1)

    for (let index = 0; index < this.anchors.length; index++) {
      const anchor = this.anchors[index]
      if (anchor.isAnchorNear(point)) {
        return {
          type: PathHitType.Anchor,
          point: anchor,
          ends: [
            this.anchors[index - 1] ?? (closed ? last : first),
            this.anchors[index + 1] ?? (closed ? first : last),
          ],
        }
      }
    }
  }

  public hitPathTest(viewPoint: Vector): PathHitResult | undefined {
    const point = this.toLocalPoint(viewPoint)
    const { closed } = this

    /**
     * http://paperjs.org/reference/path/#hittest-point
     * https://github.com/paperjs/paper.js/blob/v0.12.15/src/path/Path.js#L1699-L1721
     */
    const hitResult: paper.HitResult | undefined = this.path.hitTest(
      new paper.Point(point),
      {
        stroke: true,
        segments: false,
        // BUG with paperjs hit handles
        handles: false,
        fill: false,
      },
    )
    if (!hitResult) return

    const first = this.anchors.at(0)
    const last = this.anchors.at(-1)

    if (hitResult.type === 'stroke') {
      const { point, location } = hitResult
      return {
        type: PathHitType.Stroke,
        point: new VectorAnchor(point),
        ends: [
          this.anchors[location.index],
          this.anchors[location.index + 1] ?? (closed ? first : last),
        ],
        t: location.time,
        curveIndex: location.index,
      }
    }
  }

  public hitFillTest(viewPoint: Vector):
   | (PathHitResult & { type: PathHitType.Fill })
   | undefined
  {
    if (!this.closed) return

    const point = this.toLocalPoint(viewPoint)

    const hitResult: paper.HitResult | undefined = this.path.hitTest(
      new paper.Point(point),
      {
        stroke: false,
        segments: false,
        handles: false,
        fill: true,
      },
    )
    if (!hitResult) return

    if (hitResult.type === 'fill') {
      return {
        type: PathHitType.Fill,
      }
    }
  }

  /**
   *
   * @TODO temporary, need to use translationMatrix to change position
   */
  public move(delta: Vector) {
    // this.position = add(this.position, delta)
    this.anchors.forEach(anchor => {
      anchor.position = add(anchor.position, delta)
    })
  }
}
