import { generateKeyBetween } from 'fractional-indexing'
import { Container } from '@pixi/display'
import {
  decomposeMatrix,
  getInverseMatrix,
  multiply,
  identityMatrix,
} from 'vectorial'
import { SharedMap } from '@vectorial/whiteboard/utils'
import {
  BaseDataMixin,
  SceneNodeData,
  ChildrenDataMixin,
} from '@vectorial/whiteboard/model'
import {
  Constructor,
  BaseNodeMixin,
  LayoutMixin,
  ChildrenMixin as ChildrenMixinType,
  SceneNode,
  NodeManagerMixin as NodeManagerMixinType,
} from '../types'


export type ParentNode = (
  & BaseNodeMixin
  & ChildrenMixinType
  & { binding: SharedMap<{ children: BaseDataMixin['id'][] }> }
)


export const NodeManagerMixin = <S extends Constructor<ChildrenMixinType & BaseNodeMixin>>(Super: S) => {
  return class NodeManagerMixin extends Super implements NodeManagerMixinType {
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
      if (id === this.id) return this as any as SceneNode
      return id ? this.nodes[id] : undefined
    }

    delete(id: string): void {
      this.binding.doc!.transact(() => {
        const node = this.get(id)
        if (!node) return
        node.removed = true

        const getDescendant = (node?: SceneNode | ParentNode): SceneNode['id'][] => {
          if (!node) return []
          if (!('children' in node)) return []
          return [
            ...node.forEachChild(({ id }) => id),
            ...node.forEachChild(getDescendant).flat(),
          ]
        }

        const parent: ParentNode = node.parent === this.id
          // now this is PageNode
          ? this
          : this.get(node.parent) as ParentNode

        if (parent) {
          const index = parent.children.indexOf(id)

          parent.children.splice(index, 1)
          parent.container.removeChild(node.container)
          parent.binding.get('children')!.delete(index, 1)
        }

        const descendant = getDescendant(node)
        descendant.forEach(id => {
          delete this.nodes[id]
          this.binding.get('nodes')!.delete(id)
        })

        delete this.nodes[id]
        this.binding.get('nodes')!.delete(id)
      })
    }

    /**
     * Intention to insert an new node into page
     */
    insert(node: SceneNode, parent: ParentNode, after?: string): void {
      const children = parent.children.map(id => this.get(id)!)

      this.binding.doc!.transact(() => {
        if (node.removed) node.removed = false

        const {
          index,
          order,
        } = getAfterOrder(children, after)
        node.order = order
        node.parent = parent.id

        parent.container.addChildAt(node.container, index)
        parent.children.splice(index, 0, node.id)
        parent.binding.get('children')!.insert(index, [node.id])
        this.add(node)
      })
    }

    relocate(nodes: SceneNode[], parent: ParentNode, after?: string): void {
      this.binding.doc!.transact(() => {
        const removeFromOrigin = (node: SceneNode) => {
          const originParent = this.get(node.parent)! as ParentNode
          const originIndex = originParent.children.indexOf(node.id)
          originParent.children.splice(originIndex, 1)
          originParent.container.removeChild(node.container)
          originParent.binding.get('children')!.delete(originIndex, 1)
        }

        const insertToParent = (node: SceneNode, order: string, index: number) => {
          const { absoluteTransform } = node
          const originParent = this.get(node.parent)! as ParentNode & LayoutMixin
          const relativeTransform = multiply(
            absoluteTransform,
            getInverseMatrix(originParent.absoluteTransform ?? identityMatrix()),
          )

          if (node.removed) node.removed = false

          node.order = order
          node.parent = parent.id

          const {
            translation,
            rotation,
          } = decomposeMatrix(relativeTransform)
          node.position = translation
          node.rotation = rotation
          node.updateAbsoluteTransform()
          node.updateRelativeTransform()

          parent.container.addChildAt(node.container, index)
          parent.children.splice(index, 0, node.id)
          parent.binding.get('children')!.insert(index, [node.id])
          this.add(node)
        }

        const children: SceneNode[] = parent.children.map(id => this.get(id)!)
        const {
          index: insertIndex,
          order: insertOrder,
          nextOrder,
        } = getAfterOrder(children, after)

        let index = insertIndex
        let order = insertOrder

        nodes.forEach(node => {
          removeFromOrigin(node)
          insertToParent(node, order, index)
          index += 1
          order = generateKeyBetween(order, nextOrder)
        })
      })
    }

    find(predicate: (node: SceneNode) => any): SceneNode | undefined {
      return Object.values(this.nodes).find(predicate)
    }

    filter(predicate: (node: SceneNode) => any): SceneNode[] {
      return Object.values(this.nodes).filter(predicate)
    }
  }
}


const getAfterOrder = (children: SceneNode[], after?: string): {
  index: number;
  order: string;
  nextOrder: string | null;
} => {
  if (!after) {
    const order = generateKeyBetween(children.at(-1)?.order ?? null, null)
    return {
      index: children.length,
      order,
      nextOrder: null,
    }

  } else {
    const index = children.findIndex(child => child.order === after)
    if (index === -1) {
      return getAfterOrder(children)
    }

    const nextOrder = children[index + 1]?.order ?? null
    const order = generateKeyBetween(
      children[index].order ?? null,
      nextOrder
    )
    return {
      index,
      order,
      nextOrder,
    }
  }
}

