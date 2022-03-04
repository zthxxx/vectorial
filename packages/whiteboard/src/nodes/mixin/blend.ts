import { SharedMap } from '@vectorial/whiteboard/utils'
import {
  BaseDataMixin,
  BlendMode,
  BlendMixin as BlendMixinType,
} from '@vectorial/whiteboard/model'
import {
  Constructor,
  EmptyMixin,
  BaseNodeMixin,
} from '../types'

export interface BlendMixinProps extends Partial<BlendMixinType>{
}

export const BlendMixin = <
  T extends BaseNodeMixin,
  S extends Constructor<T> = Constructor<T>
>(Super: S) => {
  return class BlendMixin extends (Super ?? EmptyMixin) implements BlendMixinType {
    declare binding: SharedMap<BaseDataMixin & BlendMixinType>;

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

    get opacity(): number {
      return this.binding.get('opacity')!
    }

    set opacity(opacity: number) {
      this.binding.set('opacity', opacity)
    }

    get isMask(): boolean {
      return this.binding.get('isMask')!
    }

    set isMask(isMask: boolean) {
      this.binding.set('isMask', isMask)
    }

    get blendMode(): BlendMode {
      return this.binding.get('blendMode')!
    }

    set blendMode(blendMode: BlendMode) {
      this.binding.set('blendMode', blendMode)
    }

    serializeBlend(): BlendMixinType {
      return {
        opacity: this.opacity,
        isMask: this.isMask,
        blendMode: this.blendMode,
      }
    }
  }
}
