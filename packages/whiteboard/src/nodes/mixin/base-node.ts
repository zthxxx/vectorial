
import { Container } from '@pixi/display'
import { NodeType, BaseDataMixin } from '@vectorial/whiteboard/model'
import {
  nanoid,
  SharedMap,
  binding,
} from '@vectorial/whiteboard/utils'
import {
  Constructor,
  EmptyMixin,
  BaseNodeMixin as BaseNodeMixinType,
} from '../types'
import * as Y from 'yjs'

export interface BaseNodeMixinProps extends Partial<BaseDataMixin> {
  binding?: Y.Map<BaseDataMixin[keyof BaseDataMixin]>;
}

export const BaseNodeMixin = <S extends Constructor>(Super?: S) => {
  return class BaseMixin extends (Super ?? EmptyMixin as S) implements BaseNodeMixinType {
    binding: SharedMap<BaseDataMixin>
    container: Container

    constructor(...args: any[])
    constructor(props: BaseNodeMixinProps, ...args: any[]) {
      super(props, ...args)
      const {
        id,
        name,
        parent,
        type,
        order,
        removed,
        binding,
      } = props

      this.container = new Container()
      this.binding = (binding ?? new Y.Map()) as SharedMap<BaseDataMixin>

      this.id = id ?? nanoid()
      this.name = name ?? ''
      this.parent = parent
      this.type = type ?? NodeType.Frame
      this.order = order
      this.removed = removed ?? false
    }

    clone(): BaseNodeMixinType {
      throw new Error('Not Implemented')
    }

    @binding()
    accessor id!: string

    @binding()
    accessor name!: string

    @binding()
    accessor parent: BaseDataMixin['id'] | undefined

    @binding()
    accessor type!: NodeType

    @binding()
    accessor order: string | undefined

    @binding({
      onChange(removed) {
        this.container.visible = !removed
      },
    })
    accessor removed: boolean | undefined

    serializeBaseData(): BaseDataMixin {
      const {
        id,
        name,
        parent,
        type,
        order,
        removed,
      } = this
      return {
        id,
        name,
        parent,
        type,
        order,
        removed,
      }
    }
  }
}
