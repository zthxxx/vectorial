import { generateKeyBetween } from 'fractional-indexing'
import { Container } from '@pixi/display'
import { SharedMap } from '@vectorial/whiteboard/utils'
import {
  Constructor,
  EmptyMixin,
  BaseNodeMixin as BaseNode,
  ChildrenMixin as ChildrenMixinType,
  SceneNode,
  NodeManagerMixin as NodeManagerMixinType,
} from '../types'
import {
  BaseDataMixin,
  SceneNodeData,
} from '@vectorial/whiteboard/model'


export type ParentNode = (
  & ChildrenMixinType
  & BaseNode
  & { binding: SharedMap<{ children: BaseDataMixin['id'][] }> }
)


export const NodeManagerMixin = <S extends Constructor>(Super: S) => {
  return class NodeManagerMixin extends (Super ?? EmptyMixin) implements NodeManagerMixinType {
    declare binding: SharedMap<{
      nodes: { [key: SceneNodeData['id']]: SceneNodeData };
    }>;
    declare container: Container
    declare children: SceneNode['id'][]
    declare nodes: { [key: SceneNode['id']]: SceneNode }

    add(node: SceneNode): void {
      if (this.nodes[node.id]) return
      this.nodes[node.id] = node
      this.binding.get('nodes')!.set(node.id, node.binding)
    }

    get(id?: string): SceneNode | undefined {
      return id ? this.nodes[id] : undefined
    }

    delete(id: string): void {
      const node = this.get(id)!
      node.removed = true
      delete this.nodes[id]
      this.binding.get('nodes')!.delete(id)

      const parent = this.get(node.parent) as ParentNode
      if (!parent) return
      const index = parent.children.indexOf(id)

      parent.children.splice(index, 1)
      parent.container.removeChild(node.container)
      parent.binding.get('children')!.delete(index, 1)
    }

    insert(node: SceneNode, parent: ParentNode, after?: string): void {
      const children = parent.children.map(id => this.get(id)!)

      node.removed = false
      const [order, index] = getAfterOrder(children, after)
      node.order = order
      node.parent = parent.id

      parent.container.addChild(node.container)
      parent.children.splice(index, 0, node.id)
      parent.binding.get('children')!.insert(index, [node.id])
      this.add(node)
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

