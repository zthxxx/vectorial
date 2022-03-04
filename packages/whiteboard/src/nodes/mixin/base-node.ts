
import { Container } from '@pixi/display'
import { NodeType, BaseDataMixin } from '@vectorial/whiteboard/model'
import { nanoid, SharedMap } from '@vectorial/whiteboard/utils'
import {
  Constructor,
  EmptyMixin,
  BaseNodeMixin as BaseNodeMixinType,
} from '../types'
import * as Y from 'yjs'

export interface BaseNodeMixinProps extends Partial<BaseDataMixin> {
  binding?: Y.Map<BaseDataMixin[keyof BaseDataMixin]>;
}

export const BaseNodeMixin = <T extends Constructor>(Super?: T) => {
  return class BaseMixin extends (Super ?? EmptyMixin) implements BaseNodeMixinType {
    binding: SharedMap<BaseDataMixin>
    container: Container

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

      if (!binding) {
        this.id = id ?? nanoid()
        this.name = name ?? ''
        this.parent = parent
        this.type = type ?? NodeType.Frame
        this.order = order
        this.removed = removed ?? false
      }
    }

    clone(): BaseNodeMixinType {
      throw new Error('Not Implemented')
    }

    get id(): string {
      return this.binding.get('id')!
    }

    set id(id: string) {
      if (this.id === id) return
      this.binding.set('id', id)
    }

    get name(): string {
      return this.binding.get('name')!
    }

    set name(name: string) {
      if (this.name === name) return
      this.binding.set('name', name)
    }

    get parent(): BaseDataMixin['id'] | undefined {
      return this.binding.get('parent')!
    }

    set parent(parent: string | undefined) {
      if (this.parent === parent) return
      this.binding.set('parent', parent)
    }

    get type(): NodeType {
      return this.binding.get('type')!
    }

    set type(type: NodeType) {
      if (this.type === type) return
      this.binding.set('type', type)
    }

    get order(): string | undefined {
      return this.binding.get('order')
    }

    set order(order: string | undefined) {
      if (this.order === order) return
      this.binding.set('order', order)
    }

    get removed(): boolean | undefined {
      return this.binding.get('removed')
    }

    set removed(removed: boolean | undefined) {
      if (this.removed === removed) return
      this.binding.set('removed', removed)
      this.container.visible = !removed
    }

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
