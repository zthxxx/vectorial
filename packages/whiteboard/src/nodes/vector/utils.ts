import {
  type SharedMap,
  YMap,
} from '@vectorial/whiteboard/utils'
import {
  Constructor,
} from '../types'

export interface BindingMixinProps<T extends object = any> {
  binding?: SharedMap<T>
}

export const BindingMixin = <S extends Constructor>(Super: S) => {
  return class BindingMixin extends Super {
    binding: SharedMap<any>

    constructor(...args: any[])
    constructor(props: BindingMixinProps, ...args: any[]) {
      super(props, ...args)

      const {
        binding,
      } = props

      this.binding = (binding ?? new YMap())
    }
  }
}
