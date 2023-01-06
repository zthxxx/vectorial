import {
  TransformMixin,
  AreaMixin,
  math,
  Rect,
  Matrix,
  Vector,
} from 'vectorial'
import {
  LayoutDataMixin,
  BaseDataMixin,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
  binding,
  YEventAction,
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
        position = math.emptyVector(),
        rotation = 0,
      } = props
      this.page = page

      this.container.position.set(position.x, position.y)
      this.container.angle = rotation

      if (!this.position) {
        this.position = position
      }

      this.rotation = rotation
    }

    @binding({
      onChange({ x, y }) {
        this.container.position.set(x, y)
      },
      onUpdate({ value: position, action }) {
        if (action !== YEventAction.Update) return
        this.container.position.set(position.x, position.y)
        this.updateRelativeTransform()
        this.updateAbsoluteTransform()
      },
    })
    accessor position: Vector = { x: 0, y: 0 }

    /**
     * euler rotation in degree,
     * rotation point is the center of the self
     */
    @binding({
      onChange(degree) {
        this.container.angle = degree
      },
      onUpdate({ value: rotation, action }) {
        if (action !== YEventAction.Update) return
        this.container.rotation = rotation
        this.updateRelativeTransform()
        this.updateAbsoluteTransform()
      },
    })
    accessor rotation: number = 0

    public get absoluteTransform(): Matrix {
      if (!this._absoluteTransform) {
        const parent = this.page.get(this.parent) as undefined | BaseNodeMixin & LayoutMixinType
        if (parent && parent.absoluteTransform) {
          this._absoluteTransform = math.multiply(
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
      this.position = math.add(this.position, viewDelta)
      this.updateAbsoluteTransform()
      this.updateRelativeTransform()
    }

    public toLocalPoint(viewPoint: Vector): Vector {
      return math.applyInverse(viewPoint, this.absoluteTransform)
    }

    public toPagePoint(point: Vector): Vector {
      return math.applyMatrix(point, this.absoluteTransform)
    }

    public hitTest(viewPoint: Vector): boolean {
      const point = this.toLocalPoint(viewPoint)
      return math.isPointInRect(point, this.bounds)
    }

    public coverTest(viewRect: Rect): boolean {
      return math.rectCoverTest(viewRect, this.bounds)
    }

    public serializeLayout(): LayoutDataMixin {
      return {
        position: this.position,
        rotation: this.rotation,
      }
    }
  }
}
