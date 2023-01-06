import {
  SharedMap,
  binding,
} from '@vectorial/whiteboard/utils'
import {
  BaseDataMixin,
  BlendMode,
  BlendMixin as BlendMixinType,
} from '@vectorial/whiteboard/model'
import {
  Constructor,
  BaseNodeMixin,
} from '../types'

export interface BlendMixinProps extends Partial<BlendMixinType>{
}

export const BlendMixin = <S extends Constructor<BaseNodeMixin>>(Super: S) => {
  return class BlendMixin extends Super implements BlendMixinType {
    declare binding: SharedMap<BaseDataMixin & BlendMixinType>

    constructor(...args: any[])
    constructor(props: BlendMixinProps, ...args: any[]) {
      super(props, ...args)
      const {
        opacity = 1,
        isMask = false,
        blendMode = BlendMode.PassThrough,
      } = props
      this.opacity = opacity
      this.isMask = isMask
      this.blendMode = blendMode
    }

    @binding()
    accessor opacity!: number

    @binding()
    accessor isMask!: boolean

    @binding()
    accessor blendMode!: BlendMode

    serializeBlend(): BlendMixinType {
      return {
        opacity: this.opacity,
        isMask: this.isMask,
        blendMode: this.blendMode,
      }
    }
  }
}
