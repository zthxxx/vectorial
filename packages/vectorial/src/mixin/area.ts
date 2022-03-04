import {
  Vector,
  Rect,
  Constructor,
  EmptyMixin,
  PathHitResult,
} from '../types'
import {
  emptyVector,
} from '../math'


export interface AreaHitMixin {
  hitPathTest(viewPoint: Vector): PathHitResult | undefined;
  /** whether hit the odd fill area */
  hitAreaTest(viewPoint: Vector): boolean;
  hitBoundsTest(viewPoint: Vector): boolean;
}

export interface AreaMixinProps {
  position?: Vector
}

export const AreaMixin = <T extends {}>(Super: Constructor<T>) => {
  return class Area extends (Super ?? EmptyMixin) {
    public _position: Vector;

    constructor(...args: any[])
    constructor(props: AreaMixinProps, ...args: any[]) {
      const { position } = props
      super(props, ...args)
      this._position = position ?? emptyVector()
    }

    public get bounds(): Rect {
      throw new Error('Not Implemented')
    }

    public get center(): Vector {
      const { width, height } = this
      const { x, y } = this._position
      return {
        x: x + width / 2,
        y: y + height / 2,
      }
    }

    public get width(): number {
      return this.bounds.width
    }

    public get height(): number {
      return this.bounds.height
    }
  }
}
