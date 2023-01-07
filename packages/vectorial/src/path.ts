import paper from 'paper'
import type { Vector, Rect } from './types'
import { VectorAnchor, AnchorData } from './anchor'
import {
  add,
  emptyVector,
} from './math'
import {
  AreaMixin,
  AreaHitMixin,
  TransformMixin,
} from './mixin'
import { BezierCurve } from './bezier'
import {
  AnchorHitResult,
  PathHitResult,
  PathHitType,
  EmptyMixin,
} from './types'

export interface PathData {
  type: 'Path';
  anchors: AnchorData[];
  closed: boolean;
  position: Vector;
  /**
   * euler rotation in degree,
   * rotation point is the center of the self
   */
  rotation: number;
  /**
   * parity of path area used for evenodd fill rule, of which,
   *    1: odd (fill)
   *    0: even (not fill)
   */
  parity: 1 | 0;
}

export const emptyPath = (): PathData => ({
  type: 'Path',
  anchors: [],
  closed: false,
  position: emptyVector(),
  rotation: 0,
  parity: 1,
})

export interface VectorPathProps {
  anchors?: VectorAnchor[];
  closed?: PathData['closed'];
  position?: PathData['position'];
  rotation?: PathData['rotation'];
  parity?: PathData['parity'];
}

export class VectorPath extends TransformMixin(AreaMixin(EmptyMixin)) implements AreaHitMixin {
  public type = 'Path'
  public path: paper.Path

  /**
   * partiy of path area used for evenodd fill rule, of which,
   *    1: odd (fill / hit)
   *    0: even (not fill / not hit)
   */
  public parity: 1 | 0

  protected _hitStrokeWidth = 8
  protected _anchors: VectorAnchor[] = []
  protected _closed: boolean = false

  constructor(props: VectorPathProps = {}) {
    const {
      anchors = [],
      closed = false,
      parity = 1,
    } = props
    super(props)

    this._anchors = anchors
    this._closed = closed
    this.parity = parity

    this.path = this.createPath()
    this.path.closed = closed
  }

  public createPath() {
    return new paper.Path({
      segments: this.anchors.map(anchor => anchor.segment),
      /**
       * stroke and fill style only for hitTest interaction, not for render
       * strokeWidth is how near can hit while mouse close to path
       */
      strokeWidth: this._hitStrokeWidth,
      strokeColor: new paper.Color(0x000),
      fillColor: new paper.Color(0x000),
      fillRule: 'evenodd',
    })
  }

  public get anchors(): Array<VectorAnchor> {
    return this._anchors
  }

  public set anchors(anchors: (VectorAnchor | undefined)[]) {
    const { closed } = this
    this.clear()
    anchors
      .filter(Boolean)
      .forEach(anchor => this.addAnchor(anchor!))
    // resume closed flag due to reset by clear()
    this.closed = closed
  }

  public get closed(): boolean {
    return this._closed
  }

  public set closed(closed: boolean) {
    this._closed = closed
    this.path.closed = closed
  }

  public get position(): Vector {
    return this._position
  }

  public set position({ x, y }: Vector) {
    this._position = { x, y }
    const { width, height } = this.bounds
    this.path.position = new paper.Point(x + width / 2, y + height / 2)
    this.updateRelativeTransform()
  }

  public get rotation(): number {
    return this._rotation
  }

  public set rotation(degree: number) {
    this._rotation = degree
    this.path.rotation = degree
    this.updateRelativeTransform()
  }

  public get bounds(): Rect {
    const { x, y, width, height } = this.path.bounds
    return { x, y, width, height }
  }

  public addAnchor(anchor: VectorAnchor) {
    this.addAnchorAt([anchor])
  }

  public addAnchorAt(anchors: VectorAnchor[], insertIndex?: number) {
    const { length } = this.anchors
    const index = insertIndex ?? length

    this.anchors.splice(index, 0, ...anchors)
    this.path.insertSegments(index, anchors.map(anchor => anchor.segment))
  }

  public removeAnchor(anchor: VectorAnchor) {
    const index = this.anchors.indexOf(anchor)
    if (index === -1) return
    this.removeAnchorAt(index)
  }

  public removeAnchorAt(index: number, length = 1) {
    const anchor = this.anchors[index]
    if (!anchor) return
    this.anchors.splice(index, length)
    this.path.removeSegments(index, index + length)
  }

  public clear() {
    this.path.removeSegments()
    this.closed = false
    this._anchors = []
  }

  public hitAnchorTest(
    point: Vector,
    padding?: number,
  ): AnchorHitResult | undefined {
    const { closed } = this
    const first = this.anchors.at(0)
    const last = this.anchors.at(-1)

    for (let index = 0; index < this.anchors.length; index++) {
      const anchor = this.anchors[index]
      if (anchor.isAnchorNear(point, padding)) {
        return {
          type: PathHitType.Anchor,
          point: anchor,
          ends: [
            this.anchors[index - 1] ?? (closed ? last : first),
            this.anchors[index + 1] ?? (closed ? first : last),
          ],
          anchorIndex: index,
        }
      }
    }
  }

  public hitPathTest(
    point: Vector,
    padding?: number,
  ): PathHitResult | undefined {
    const { closed } = this
    if (padding && this._hitStrokeWidth !== padding) {
      this._hitStrokeWidth = padding
      this.path.strokeWidth = padding
    }

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
        type: PathHitType.Path,
        point: new VectorAnchor({ position: point }),
        ends: [
          this.anchors[location.index],
          this.anchors[location.index + 1] ?? (closed ? first : last),
        ],
        t: location.time,
        curveIndex: location.index,
      }
    }
  }

  public hitAreaTest(point: Vector): boolean {
    if (!this.closed) return false

    const hitResult: paper.HitResult | undefined = this.path.hitTest(
      new paper.Point(point),
      {
        stroke: false,
        segments: false,
        handles: false,
        fill: true,
      },
    )
    if (!hitResult) return false

    return hitResult.type === 'fill'
  }

  public hitBoundsTest(point: Vector): boolean {
    const { x, y, width, height } = this.bounds
    return (
      x <= point.x
      && point.x <= x + width
      && y <= point.y
      && point.y <= y + height
    )
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

  public pathLength(): number {
    return this.anchors.reduce((length, anchor, index) => {
      if (index === 0) return length
      const prev = this.anchors[index - 1]
      return length + BezierCurve.getLength({
        from: prev,
        to: anchor,
      })
    }, 0)
  }

  public clone(): VectorPath {
    return new VectorPath({
      anchors: this.anchors,
      closed: this.closed,
      position: { ...this.position },
      rotation: this.rotation,
      parity: this.parity,
    })
  }

  public serialize(): PathData {
    return {
      type: 'Path',
      anchors: this.anchors.map(anchor => anchor.serialize()),
      closed: this.closed,
      position: { ...this.position },
      rotation: this.rotation,
      parity: this.parity,
    }
  }

  static from(path: PathData): VectorPath {
    return new VectorPath({
      anchors: path.anchors.map(anchor => VectorAnchor.from(anchor)),
      closed: path.closed,
      position: { ...path.position },
      rotation: path.rotation,
      parity: path.parity,
    })
  }
}
