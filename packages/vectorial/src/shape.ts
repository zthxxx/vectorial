import paper from 'paper'
import {
  VectorPath,
  PathData,
} from './path'
import { VectorAnchor } from './anchor'
import {
  Rect,
  Vector,
  HandlerType,
  BooleanOperator,
  PathHitType,
  PathHitResult,
  EmptyMixin,
} from './types'
import {
  emptyVector,
} from './math'
import {
  AreaMixin,
  AreaHitMixin,
  TransformMixin,
} from './mixin'


export interface ShapeData {
  type: 'Shape';
  position: Vector;
  rotation: number;
  children: (PathData | ShapeData)[];
  booleanOperator: BooleanOperator;
}

export interface VectorShapeProps {
  /**
   * paths in order (top -> bottom)
   */
  children: (VectorPath | VectorShape)[];
  booleanOperator: BooleanOperator;
  position?: ShapeData['position'];
  rotation?: ShapeData['rotation'];
}

/**
 * composed shape cannot be directly edit
 */
export class VectorShape extends TransformMixin(AreaMixin(EmptyMixin)) implements AreaHitMixin {
  public type = 'Shape'
  public children: (VectorPath | VectorShape)[] = []
  public booleanOperator: BooleanOperator
  public _compoundPath: paper.CompoundPath | paper.Path | undefined

  constructor(props: VectorShapeProps) {
    super(props)
    const {
      children,
      booleanOperator,
      position = emptyVector(),
      rotation = 0,
    } = props
    this.children = children
    this.booleanOperator = booleanOperator

    this._position = position
    this._rotation = rotation
    this.updateRelativeTransform()
  }

  public get bounds(): Rect {
    return this.compoundPath.bounds
  }

  get composed(): boolean {
    return this.children.length > 1
  }

  get compoundPath(): paper.CompoundPath | paper.Path {
    if (!this._compoundPath) {
      const operator = (
        this.booleanOperator === BooleanOperator.Union ? 'unite' : this.booleanOperator
      ).toLocaleLowerCase() as 'unite' | 'intersect' | 'subtract' | 'exclude'

      this._compoundPath = this.children
        .map(item => (item instanceof VectorShape)
          ? item.compoundPath
          : item.path
        )
        .reduce((bottom, top) => bottom[operator](top) as paper.CompoundPath)
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


  public hitPathTest(viewPoint: Vector): PathHitResult | undefined {
    const point = this.toLocalPoint(viewPoint)
    const compound = this.compoundPath

    const hitResult: paper.HitResult | undefined = compound.hitTest(
      new paper.Point(point.x, point.y),
      {
        stroke: true,
        segments: false,
        handles: false,
        fill: false,
      },
    )
    if (!hitResult) return

    if (hitResult.type === 'stroke') {
      /**
       * don't get location detail of hit curve in VectorShape
       */
      return {
        type: PathHitType.Path,
        point: new VectorAnchor(point),
      } as any as PathHitResult
    }
  }

  public hitAreaTest(viewPoint: Vector): boolean {
    const point = this.toLocalPoint(viewPoint)
    const compound = this.compoundPath

    const hitResult: paper.HitResult | undefined = compound.hitTest(
      new paper.Point(point.x, point.y),
      {
        stroke: true,
        segments: false,
        handles: false,
        fill: false,
      },
    )

    return Boolean(hitResult)
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

  public clone(): VectorShape {
    return new VectorShape({
      booleanOperator: this.booleanOperator,
      children: this.children.map(path => path.clone()),
    })
  }

  public serialize(): ShapeData {
    return {
      type: 'Shape',
      children: this.children.map(path => path.serialize()),
      booleanOperator: this.booleanOperator,
      position: { ...this.position },
      rotation: this.rotation,
    }
  }

  static from(shape: ShapeData): VectorShape {
    return new VectorShape({
      booleanOperator: shape.booleanOperator,
      children: shape.children.map(path => (
        path.type === 'Shape'
          ? VectorShape.from(path)
          : VectorPath.from(path)
      )),
      position: { ...shape.position },
      rotation: shape.rotation,
    })
  }
}

