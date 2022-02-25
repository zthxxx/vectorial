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
  Handler = 'Handler',
  Stroke = 'Stroke',
  Fill = 'Fill',
}

export interface PathHitResult {
  type: PathHitType,
  point: VectorAnchor;
  ends: [VectorAnchor, VectorAnchor];
}

export class VectorPath {
  public anchors: VectorAnchor[] = []
  public closed: boolean = false
  public path: paper.Path
  public segmentMap: Map<paper.Segment, VectorAnchor>

  constructor(anchors: VectorAnchor[] = [], closed: boolean = false) {
    this.anchors = anchors
    this.closed = closed
    this.path = new PaperPath({
      /** stroke style only for hitTest interaction */
      strokeWidth: 10,
      strokeColor: new Color(0x000),
      segments: anchors.map(anchor => anchor.segment),
    })
    this.segmentMap = new Map(anchors.map(anchor => [anchor.segment, anchor]))
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
    const hitResult: paper.HitResult | undefined = this.path.hitTest(new PaperPoint(point))
    if (!hitResult) return

    if (hitResult.type === 'segment') {
      const hitSegment: paper.Segment = hitResult.segment
      const anchor = this.segmentMap.get(hitResult.segment)!
      return {
        type: PathHitType.Anchor,
        point: anchor,
        ends: [
          this.anchors[hitSegment.index - 1] ?? this.anchors[0],
          this.anchors[hitSegment.index + 1] ?? this.anchors[0],
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
          this.anchors[location.index + 1],
        ],
      }
    }
  }
}
