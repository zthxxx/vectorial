import {
  TransformMixin,
  AreaMixin,
  Rect,
  Matrix,
  identityMatrix,
  Vector,
  multiply,
  isPointInRect,
  rectCoverTest,
} from 'vectorial'
import {
  LayoutDataMixin,
} from '@vectorial/whiteboard/model'
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

export const LayoutMixin = <T extends BaseNodeMixin>(Super: Constructor<T>) => {
  return class LayoutMixin extends TransformMixin(AreaMixin(Super)) implements LayoutMixinType {
    declare parent: BaseNodeMixin['id']
    // forEachChild maybe miss when using without ChildrenMixin
    declare forEachChild: ChildrenMixin['forEachChild']

    public page: PageNode
    public _absoluteTransform: Matrix = identityMatrix()

    constructor(...args: any[])
    constructor(props: LayoutMixinProps, ...args: any[]) {
      super(props, ...args)
      const {
        page,
      } = props
      this.page = page
    }

    public get absoluteTransform(): Matrix {
      return this._absoluteTransform
    }

    public get absoluteBounds(): Rect {
      throw new Error('Not Implemented')
    }

    public updateAbsoluteTransform(): void {
      if (this.page.get(this.parent)) {
        const parent = this.page.get(this.parent)! as BaseNodeMixin & LayoutMixinType
        if (parent.absoluteTransform) {
          this._absoluteTransform = multiply(
            parent.absoluteTransform,
            this.relativeTransform,
          )
        }
      } else {
        this._absoluteTransform = this.relativeTransform
      }

      this.forEachChild?.((node: BaseNodeMixin & LayoutMixinType) => {
        node.updateAbsoluteTransform?.()
      })
    }

    public updateRelativeTransform(): void {
      super.updateRelativeTransform()
      this.updateAbsoluteTransform()
    }

    public resize(width: number, height: number): void {
      throw new Error('Not Implemented')
    }

    public rescale(scale: number): void {
      throw new Error('Not Implemented')
    }

    public hitTest(viewPoint: Vector): boolean {
      const point = this.toLocalPoint(viewPoint)
      return isPointInRect(point, this.bounds)
    }

    public coverTest(viewRect: Rect): boolean {
      return rectCoverTest(viewRect, this.bounds, this.absoluteTransform)
    }

    public serializeLayout(): LayoutDataMixin {
      return {
        position: this.position,
        rotation: this.rotation,
      }
    }
  }
}
