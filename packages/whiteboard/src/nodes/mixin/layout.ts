import {
  TransformMixin,
  AreaMixin,
  add,
  Rect,
  Matrix,
  Vector,
  multiply,
  isPointInRect,
  rectCoverTest,
  applyMatrix,
  applyInverse,
  emptyVector,
} from 'vectorial'
import {
  LayoutDataMixin,
  BaseDataMixin,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
  toSharedTypes,
} from '@vectorial/whiteboard/utils'
import {
  Constructor,
  BaseNodeMixin,
  ChildrenMixin,
  PageNode,
  LayoutMixin as LayoutMixinType,
} from '../types'

export interface LayoutMixinProps extends Partial<LayoutDataMixin> {
  page: PageNode;
}

export const LayoutMixin = <S extends Constructor<BaseNodeMixin>>(Super: S) => {
  return class LayoutMixin extends TransformMixin(AreaMixin(Super)) implements LayoutMixinType {
    declare binding: SharedMap<BaseDataMixin & LayoutDataMixin>
    declare parent: BaseNodeMixin['id']
    // forEachChild maybe miss when using without ChildrenMixin
    declare forEachChild: ChildrenMixin['forEachChild']

    public page: PageNode
    public _absoluteTransform: Matrix | null = null

    constructor(...args: any[])
    constructor(props: LayoutMixinProps, ...args: any[]) {
      super(props, ...args)
      const {
        page,
        position = emptyVector(),
        rotation = 0,
      } = props
      this.page = page

      this.container.position.set(position.x, position.y)
      this.container.angle = rotation

      if (!this.binding.get('position')) {
        this.binding.set('position', toSharedTypes(position))
      }

      if (!this.binding.has('rotation')) {
        this.binding.set('rotation', rotation)
      }
    }

    public get position(): Vector {
      return this.binding.get('position')!.toJSON()
    }

    public set position({ x, y }: Vector) {
      this.binding.set('position', toSharedTypes({ x, y }))
      this.container.position.set(x, y)
    }

    public get rotation(): number {
      return this.binding.get('rotation')!
    }

    public set rotation(degree: number) {
      this.binding.set('rotation', degree)
      this.container.angle = degree
    }

    public get absoluteTransform(): Matrix {
      if (!this._absoluteTransform) {
        const parent = this.page.get(this.parent) as undefined | BaseNodeMixin & LayoutMixinType
        if (parent && parent.absoluteTransform) {
          this._absoluteTransform = multiply(
            parent.absoluteTransform,
            this.relativeTransform,
          )
        } else {
          this._absoluteTransform = this.relativeTransform
        }
      }

      return this._absoluteTransform
    }

    public get absoluteBounds(): Rect {
      throw new Error('Not Implemented')
    }

    public updateAbsoluteTransform(): void {
      this._absoluteTransform = null

      this.forEachChild?.((node: BaseNodeMixin & LayoutMixinType) => {
        node.updateAbsoluteTransform?.()
      })
    }

    public resize(width: number, height: number): void {
      throw new Error('Not Implemented')
    }

    public rescale(scale: number): void {
      throw new Error('Not Implemented')
    }

    public moveDelta(viewDelta: Vector) {
      // due to we are not make scale as matrix transform
      this.position = add(this.position, viewDelta)
      this.updateAbsoluteTransform()
      this.updateRelativeTransform()
    }

    public toLocalPoint(viewPoint: Vector): Vector {
      return applyInverse(viewPoint, this.absoluteTransform)
    }

    public toPagePoint(point: Vector): Vector {
      return applyMatrix(point, this.absoluteTransform)
    }

    public hitTest(viewPoint: Vector): boolean {
      const point = this.toLocalPoint(viewPoint)
      return isPointInRect(point, this.bounds)
    }

    public coverTest(viewRect: Rect): boolean {
      return rectCoverTest(viewRect, this.bounds)
    }

    public serializeLayout(): LayoutDataMixin {
      return {
        position: this.position,
        rotation: this.rotation,
      }
    }
  }
}
