import {
  Vector,
  Matrix,
  Constructor,
  EmptyMixin,
} from '../types'
import {
  emptyVector,
  toTranslation,
  toRotation,
  multiply,
  identityMatrix,
  applyInverse,
  applyMatrix,
} from '../math'

export interface TransformMixinProps {
  position?: Vector
  rotation?: number
}

export const TransformMixin = <T extends { width: number, height: number }>(Super: Constructor<T>) => {
  return class Transformable extends (Super ?? EmptyMixin) {
    public _position: Vector;
    /**
     * euler rotation in degree,
     * rotation point is the center of the self
     */
    public _rotation: number;
    public _relativeTransform: Matrix

    constructor(...args: any[])
    constructor(props: TransformMixinProps, ...args: any[]) {
      const {
        position,
        rotation,
      } = props
      super(props, ...args)
      this._position = position ?? emptyVector()
      this._rotation = rotation ?? 0
      this._relativeTransform = identityMatrix()

      this.updateRelativeTransform()
    }

    public get relativeTransform(): Matrix {
      return this._relativeTransform
    }

    public updateRelativeTransform() {
      // make rotate around own center
      this._relativeTransform = multiply(
        toTranslation(
          this.position.x + this.width / 2,
          this.position.y + this.height / 2
        ),
        toRotation(this.rotation),
        toTranslation(
          -this.width / 2,
          -this.height / 2
        ),
      )
    }

    public get position(): Vector {
      return this._position
    }

    public set position({ x, y }: Vector) {
      this._position = { x, y }
      this.updateRelativeTransform()
    }

    public get rotation(): number {
      return this._rotation
    }

    public set rotation(degree: number) {
      this._rotation = degree
      this.updateRelativeTransform()
    }

    /**
     * @param point - parent coordinate position
     * @returns point - local coordinate position
     */
    public toLocalPoint(viewPoint: Vector): Vector {
      return applyMatrix(viewPoint, this.relativeTransform)
    }

    /**
     * @param point - local coordinate position
     * @returns point - parent view coordinate position
     */
    public toParentPoint(point: Vector): Vector {
      return applyInverse(point, this.relativeTransform)
    }
  }
}


