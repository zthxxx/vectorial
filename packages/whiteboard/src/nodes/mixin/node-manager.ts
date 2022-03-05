import { generateKeyBetween } from 'fractional-indexing'
import { Container } from '@pixi/display'
import { SharedMap } from '@vectorial/whiteboard/utils'
import {
  Constructor,
  EmptyMixin,
  BaseNodeMixin,
  ChildrenMixin as ChildrenMixinType,
  SceneNode,
  NodeManagerMixin as NodeManagerMixinType,
} from '../types'
import {
  BaseDataMixin,
  SceneNodeData,
  ChildrenDataMixin,
  documentsTransact,
} from '@vectorial/whiteboard/model'


export type ParentNode = (
  & ChildrenMixinType
  & BaseNodeMixin
  & { binding: SharedMap<{ children: BaseDataMixin['id'][] }> }
)


export const NodeManagerMixin = <T extends ChildrenMixinType & BaseNodeMixin>(Super: Constructor<T>) => {
  return class NodeManagerMixin extends (Super ?? EmptyMixin) implements NodeManagerMixinType {
    declare binding: SharedMap<ChildrenDataMixin & BaseDataMixin & {
      nodes: { [key: SceneNodeData['id']]: SceneNodeData };
    }>;
    declare container: Container
    declare children: SceneNode['id'][]
    declare nodes: { [key: SceneNode['id']]: SceneNode }

    add(node: SceneNode): void {
      if (this.nodes[node.id]) return
      this.nodes[node.id] = node
      const nodesBinding = this.binding.get('nodes')!
      if (nodesBinding.get(node.id) !== node.binding) {
        nodesBinding.set(node.id, node.binding)
      }
    }

    get(id?: string): SceneNode | undefined {
      return id ? this.nodes[id] : undefined
    }

    delete(id: string): void {
      documentsTransact(() => {
        const node = this.get(id)!
        node.removed = true

        const parent: ParentNode = node.parent === this.id
          ? this as ParentNode
          : this.get(node.parent) as ParentNode

        if (parent) {
          const index = parent.children.indexOf(id)

          parent.children.splice(index, 1)
          parent.container.removeChild(node.container)
          parent.binding.get('children')!.delete(index, 1)
        }

        delete this.nodes[id]
        this.binding.get('nodes')!.delete(id)
      })
    }

    insert(node: SceneNode, parent: ParentNode, after?: string): void {
      const children = parent.children.map(id => this.get(id)!)

      documentsTransact(() => {
        node.removed = false
        const [order, index] = getAfterOrder(children, after)
        node.order = order
        node.parent = parent.id

        parent.container.addChild(node.container)
        parent.children.splice(index, 0, node.id)
        parent.binding.get('children')!.insert(index, [node.id])
        this.add(node)
      })
    }

    relocate(node: SceneNode, parent: ParentNode, after?: string): void {
      throw new Error('Not Implemented')
    }

    find(predicate: (node: SceneNode) => any): SceneNode | undefined {
      return Object.values(this.nodes).find(predicate)
    }

    filter(predicate: (node: SceneNode) => any): SceneNode[] {
      return Object.values(this.nodes).filter(predicate)
    }
  }
}


const getAfterOrder = (children: SceneNode[], after?: string): [string, number] => {
  if (!after) {
    const order = generateKeyBetween(null, children[0]?.order ?? null)
    return [order, 0]
  } else {
    const index = children.findIndex(child => child.order === after)
    const order = generateKeyBetween(
      children[index]?.order ?? null, index === -1
        ? null
        : children[index + 1]?.order ?? null
    )
    return [order, index]
  }
}

