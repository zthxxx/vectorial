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
  SceneNode,
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
            this.addChild(this.page.get(id) as SceneNode)
          })
        }
      } else if (this.page) {
        this.resumeChildren(children)
      }
    }

    resumeChildren(children: string[]) {
      children.forEach(id => {
        const node = this.page.get(id)
        if (!node) return
        this.container.addChild(node.container)
        this.children.push(node.id)
      })
    }

    addChild(child: SceneNode): void {
      this.page.insert(
        child,
        this,
      )
    }

    insertChild(index: number, child: SceneNode): void {
      this.page.insert(
        child,
        this,
        this.page.get(this.children[index])?.order,
      )
    }

    removeChild(child: SceneNode): void {
      const index = this.children.indexOf(child.id)
      if (index < 0) return
      this.children.splice(index, 1)
      this.binding.get('children')!.delete(index, 1)
      this.page.delete(child.id)
    }

    filterChild(predicate: (node: SceneNode) => any): SceneNode[] {
      return this.children
        .map(id => this.page.get(id) as SceneNode)
        .filter(Boolean)
        .filter(predicate)
    }

    findChild(predicate: (node: SceneNode) => any): SceneNode | undefined {
      return this.children
        .map(id => this.page.get(id) as SceneNode)
        .filter(Boolean)
        .find(predicate)
    }

    forEachChild<K>(callback: (node: SceneNode) => K): K[] {
      return this.children
        .map(id => this.page.get(id))
        .filter(Boolean)
        .map(callback)
    }

    /**
     * yjs update handler, use like this in constructor
     * this.binding.get('children')!.observe(this.childrenUpdate)
     */
    public childrenUpdate = (event: Y.YArrayEvent<any>, transaction: Y.Transaction) => {
      const { delta } = event
      /**
       * we are not set origin in transact manually,
       * so origin will be null in local client, but be Room from remote
       */
      if (!transaction.origin) return
      let current = 0
      for (const item of delta) {
        Object.entries(item).forEach(([key, value]) => {
          switch (key) {
            case 'retain': {
              current += value as number
              break
            }
            case 'insert': {
              const list = Array.isArray(value) ? value : [value]
              this.children.splice(current, 0, ...list as SceneNode['id'][])
              list.forEach((id, i) => {
                const index = current + i
                // require page nodes binding add before children insert
                const node = this.page.get(id)
                if (node) {
                  this.container.addChildAt(node.container, index)
                }
              })
              break
            }
            case 'delete': {
              const len = value as number
              let index = len
              while (index) {
                const childId = this.children[current + index - 1]
                // require page nodes binding delete after children update
                const node = this.page.get(childId)
                if (node) {
                  this.container.removeChild(node.container)
                }
                index = index - 1
              }
              this.children.splice(current, len)
              break
            }
          }
        })
      }
    }
  }
}
