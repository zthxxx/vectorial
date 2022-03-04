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
import {
  AnchorHitResult,
  PathHitResult,
  PathHitType,
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

export class VectorPathProps {
  anchors?: VectorAnchor[];
  closed?: PathData['closed'];
  position?: PathData['position'];
  rotation?: PathData['rotation'];
  parity?: PathData['parity'];
}

export class VectorPath extends TransformMixin(AreaMixin()) implements AreaHitMixin {
  public type = 'Path'
  public path: paper.Path

  /**
   * partiy of path area used for evenodd fill rule, of which,
   *    1: odd (fill)
   *    0: even (not fill)
   */
  public parity: 1 | 0;
  private _anchors: VectorAnchor[] = []
  private _closed: boolean = false

  constructor({
    anchors = [],
    closed = false,
    parity = 1,
  }: VectorPathProps = {}) {
    super()

    this._anchors = anchors
    this._closed = closed
    this.parity = parity

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
  }

  public set anchors(anchors: (VectorAnchor | undefined)[]) {
    const { closed } = this
    this.clear()
    anchors
      .filter(Boolean)
      .forEach(anchor => this.addAnchor(anchor!))
    this.closed = closed
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

  public get anchors(): Array<VectorAnchor> {
    return this._anchors
  }

  public addAnchor(anchor: VectorAnchor) {
    this.addAnchorAt(anchor)
  }

  public addAnchorAt(anchor: VectorAnchor, insertIndex?: number) {
    const { length } = this.anchors
    const index = insertIndex ?? length

    this.anchors.splice(index, 0, anchor)
    this.path.insert(index, anchor.segment)
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
  }

  public clear() {
    this.path.removeSegments()
    this.closed = false
    this._anchors = []
  }

  public hitAnchorTest(viewPoint: Vector): AnchorHitResult | undefined {
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
        type: PathHitType.Path,
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

  public hitAreaTest(viewPoint: Vector): boolean {
    if (!this.closed) return false

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
    if (!hitResult) return false

    return hitResult.type === 'fill'
  }

  public hitBoundsTest(viewPoint: Vector): boolean {
    const point = this.toLocalPoint(viewPoint)
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
