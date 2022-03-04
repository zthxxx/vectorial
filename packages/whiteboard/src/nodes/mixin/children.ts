import * as Y from 'yjs'
import { SharedMap } from '@vectorial/whiteboard/utils'
import {
  BaseDataMixin
} from '@vectorial/whiteboard/model'
import {
  Constructor,
  EmptyMixin,
  PageNode,
  BaseNodeMixin,
  ChildrenMixin as ChildrenMixinType,
} from '../types'

export interface ChildrenMixinProps extends Partial<ChildrenMixinType>{
  page: PageNode;
}

export const ChildrenMixin = <
  T extends BaseNodeMixin,
  S extends Constructor<T> = Constructor<T>
>(Super: S) => {
  return class ChildrenMixin extends (Super ?? EmptyMixin) implements ChildrenMixinType {
    declare binding: SharedMap<BaseDataMixin & { children: string[] }>;

    readonly children: string[]
    public page: PageNode

    constructor(...args: any[])
    constructor(props: ChildrenMixinProps, ...args: any[]) {
      super(props, ...args)
      const {
        children = [],
        page,
      } = props
      this.children = []

      // page params maybe empty in constructor when using ChildrenMixin in PageNode
      this.page = page

      if (!this.binding.get('children')) {
        this.binding.set('children', Y.Array.from(children))

        if (this.page) {
          children.forEach(id => {
            this.addChild(this.page.get(id) as T)
          })
        }
      } else if (this.page) {
        this.resumeChildren(children)
      }
    }

    resumeChildren(children: string[]) {
      children.forEach(id => {
        const node = this.page.get(id)!
        this.container.addChild(node.container)
        this.children.push(node.id)
      })
    }

    addChild(child: T): void {
      this.page.insert(
        child,
        this,
      )
    }

    insertChild(index: number, child: T): void {
      this.page.insert(
        child,
        this,
        this.page.get(this.children[index - 1])?.order,
      )
    }

    removeChild(child: T): void {
      const index = this.children.indexOf(child.id)
      if (index < 0) return
      this.children.splice(index, 1)
      this.binding.get('children')!.delete(index, 1)
      this.page.delete(child.id)
    }

    filterChild(predicate: (node: T) => any): T[] {
      return this.children
        .map(id => this.page.get(id) as T)
        .filter(predicate)
    }

    findChild(predicate: (node: T) => any): T | undefined {
      return this.children
        .map(id => this.page.get(id) as T)
        .find(predicate)
    }

    forEachChild<K>(callback: (node: T) => K): K[] {
      return this.children
        .map(id => this.page.get(id) as T)
        .map(callback)
    }
  }
}
