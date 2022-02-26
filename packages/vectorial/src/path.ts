import type paper from 'paper'
import {
  Point as PaperPoint,
  Segment as PaperSegment,
  Path as PaperPath,
  Color,
} from 'paper'
import type { Vector } from './types'
import { VectorAnchor } from './anchor'


export enum PathHitType {
  Anchor = 'Anchor',
  InHandler = 'InHandler',
  OutHandler = 'OutHandler',
  Stroke = 'Stroke',
  Fill = 'Fill',
}

export interface PathHitResult {
  type: PathHitType,
  point: VectorAnchor;
  ends: [VectorAnchor, VectorAnchor];
}

export class VectorPath {
  private _anchors: VectorAnchor[] = []
  private _closed: boolean = false
  public path: paper.Path
  public segmentMap: Map<paper.Segment, VectorAnchor>

  constructor(anchors: VectorAnchor[] = [], closed: boolean = false) {
    this._anchors = anchors
    this._closed = closed
    this.path = new PaperPath({
      /** stroke style only for hitTest interaction */
      strokeWidth: 10,
      strokeColor: new Color(0x000),
      segments: anchors.map(anchor => anchor.segment),
    })
    this.segmentMap = new Map(anchors.map(anchor => [anchor.segment, anchor]))
  }

  public get anchors(): Array<VectorAnchor> {
    return this._anchors
  }

  public set anchors(anchors: VectorAnchor[]) {
    this.clear()
    anchors.forEach(anchor => this.addAnchor(anchor))
  }

  public get closed(): boolean {
    return this._closed
  }
  public set closed(closed: boolean) {
    this._closed = closed
    this.path.closed = closed
  }

  public addAnchor(anchor: VectorAnchor) {
    this.addAnchorAt(anchor)
  }

  public addAnchorAt(anchor: VectorAnchor, insertIndex?: number) {
    const { length } = this.anchors
    const index = insertIndex ?? length

    this.anchors.splice(insertIndex ?? length, 0, anchor)
    this.path.insert(index, anchor.segment)
    this.segmentMap.set(anchor.segment, anchor)
  }


  public hitTest(point: Vector): PathHitResult | undefined {
    const { closed } = this
    /**
     * http://paperjs.org/reference/path/#hittest-point
     * https://github.com/paperjs/paper.js/blob/v0.12.15/src/path/Path.js#L1699-L1721
     */
    const hitResult: paper.HitResult | undefined = this.path.hitTest(
      new PaperPoint(point),
      //// BUG with hit handles
      // {
      //   handles: true,
      // },
    )
    if (!hitResult) return

    const typeMap: { [key: string]: PathHitType } = {
      segment: PathHitType.Anchor,
      'handle-in': PathHitType.InHandler,
      'handle-out': PathHitType.OutHandler,
    }

    const first = this.anchors.at(0)
    const last = this.anchors.at(-1)
    if (hitResult.type in typeMap) {
      const hitSegment: paper.Segment = hitResult.segment
      const anchor = this.segmentMap.get(hitResult.segment)!

      return {
        type: typeMap[hitResult.type],
        point: anchor,
        ends: [
          this.anchors[hitSegment.index - 1] ?? (closed ? last : first),
          this.anchors[hitSegment.index + 1] ?? (closed ? first : last),
        ],
      }
    }
    if (hitResult.type === 'stroke') {
      const { point, location } = hitResult
      return {
        type: PathHitType.Stroke,
        point: new VectorAnchor(point),
        ends: [
          this.anchors[location.index],
          this.anchors[location.index + 1] ?? (closed ? first : last),
        ],
      }
    }
  }

  public clear() {
    this.segmentMap.clear()
    this.path.removeSegments()
    this.closed = false
    this._anchors = []
  }
}
