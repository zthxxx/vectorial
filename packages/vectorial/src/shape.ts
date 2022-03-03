import paper from 'paper'
import { VectorPath, PathHitResult, PathHitType } from './path'
import { VectorAnchor } from './anchor'
import {
  Rect,
  Vector,
  HandlerType,
  BooleanOperation,
} from './types'


export interface VectorShapeProps {
  /**
   * paths in order (top -> bottom)
   */
  children: (VectorPath | VectorShape)[];
  booleanOperation: BooleanOperation;
}

/**
 * composed shape cannot be directly edit
 */
export class VectorShape {
  public children: (VectorPath | VectorShape)[] = []
  public booleanOperation: BooleanOperation = 'unite'
  public _compoundPath: paper.CompoundPath | paper.Path | undefined

  constructor({
    children,
    booleanOperation,
  }: VectorShapeProps) {
    this.children = children
    this.booleanOperation = booleanOperation
  }

  get composed(): boolean {
    return this.children.length > 1
  }

  get compoundPath(): paper.CompoundPath | paper.Path {
    if (!this._compoundPath) {
      this._compoundPath = this.children
        .map(item => (item instanceof VectorShape)
          ? item.compoundPath
          : item.path
        )
        .reduceRight((bottom, top) => bottom[this.booleanOperation](top) as paper.CompoundPath)
    }
    return this._compoundPath
  }

  get areas(): VectorPath[] {
    const compound = this.compoundPath
    const toVectorPath = (path: paper.Path) => new VectorPath({
      closed: true,
      anchors: path.segments.map(segment => new VectorAnchor(
        segment.point,
        HandlerType.Free,
        {
          inHandler: segment.handleIn,
          outHandler: segment.handleOut,
        },
      )),
      parity: path.area > 0 ? 1 : 0,
    })

    if (compound instanceof paper.Path) {
      return [toVectorPath(compound)]
    }

    return compound.children.map(toVectorPath)
  }

  public get bounds(): Rect {
    return this.compoundPath.bounds
  }

  public get width(): number {
    return this.bounds.width
  }

  public get height(): number {
    return this.bounds.height
  }

  public clone(): VectorShape {
    return new VectorShape({
      booleanOperation: this.booleanOperation,
      children: this.children.map(path => path.clone()),
    })
  }

  public hitPathTest(point: Vector): PathHitResult | undefined {
    const compound = this.compoundPath

    const hitResult: paper.HitResult | undefined = compound.hitTest(
      new paper.Point(point.x, point.y),
      {
        stroke: true,
        segments: false,
        // BUG with paperjs hit handles
        handles: false,
        fill: false,
      },
    )

    if (hitResult) {
      return  {
        type: PathHitType.Compound,
      }
    }
  }
}

