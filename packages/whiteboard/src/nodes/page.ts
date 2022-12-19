import { match } from 'ts-pattern'
import * as Y from 'yjs'
import {
  NodeType,
  PageData,
  SceneNodeData,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
  YMap,
  toSharedTypes,
  nanoid,
} from '@vectorial/whiteboard/utils'
import {
  BaseNodeMixin,
  ChildrenMixin,
  NodeManagerMixin,
  ParentNode,
} from './mixin'
import {
  SceneNode,
  ChildrenMixin as ChildrenMixinType,
  PageNode as PageNodeType,
} from './types'
import {
  FrameNode,
} from './frame'
import {
  VectorNode,
} from './vector-path'
import {
 BooleanOperationNode,
} from './boolean-operation'



export const NodeTypeMap = {
  [NodeType.Frame]: FrameNode,
  [NodeType.Group]: undefined,
  [NodeType.Vector]: VectorNode,
  [NodeType.BooleanOperation]: BooleanOperationNode,
}

export interface PageNodeProps extends Partial<PageData> {
  binding?: SharedMap<PageData>
}

export class PageNode extends NodeManagerMixin(ChildrenMixin(BaseNodeMixin())) implements ChildrenMixinType, PageNodeType {
  declare binding: SharedMap<PageData>
  declare type: NodeType.Page
  nodes: { [key: SceneNode['id']]: SceneNode }

  constructor(props: PageNodeProps) {
    const {
      nodes = {},
      children = [],
    } = props
    super({
      ...props,
      type: NodeType.Page,
    })

    this.page = this
    this.nodes = {}

    if (!this.binding.get('nodes')) {
      this.binding.set('nodes', toSharedTypes(nodes))
    }
    const nodesBinding = this.binding.get('nodes')!

    Object.values(nodes).forEach((node: SceneNodeData) => {
      const nodeBinding: YMap<any> | undefined = nodesBinding.get(node.id)
      const NodeType = NodeTypeMap[node.type]
      if (!NodeType) return

      const item = new NodeType({
        ...node as any,
        type: undefined,
        binding: nodeBinding,
        page: this,
      })

      this.nodes[node.id] = item
      if (!nodeBinding) {
        nodesBinding.set(node.id, item.binding)
      }
    })

    this.resumeChildren(children)
    this.binding.get('children')!.observe(this.childrenUpdate)
    this.binding.get('nodes')!.observe(this.nodesUpdate)
  }

  clone(): PageNode {
    const nodes: PageNode['nodes'] = Object.fromEntries(
      Object.values(this.nodes)
      .map(node => [node.id, node.clone()])
    )

    return new PageNode({
      ...this.serializeBaseData(),
      type: NodeType.Page,
      children: [...this.children],
      binding: this.binding.clone(),
      nodes,
    })
  }

  serialize(): PageData {
    const nodes: PageData['nodes'] = Object.fromEntries(
      Object.values(this.nodes)
      .map(node => [node.id, node.serialize()])
    )

    return {
      ...this.serializeBaseData(),
      id: nanoid(),
      type: NodeType.Page,
      children: [...this.children],
      nodes,
    }
  }

  public nodesUpdate = (event: Y.YMapEvent<any>, transaction: Y.Transaction) => {
    /**
     * we are not set origin in transact manually,
     * so origin will be null in local client, but be Room from remote
     */
    if (!transaction.origin) return
    const { keys } = event

    const nodesBinding = this.binding.get('nodes')!
    for (const [key, { action }] of keys.entries()) {
      match(action)
        .with('delete', () => {
          const node = this.nodes[key]
          if (!node) return
          node.removed = true
          const parent: ParentNode = node.parent === this.id
            ? this
            : this.get(node.parent)! as ParentNode

          parent?.container.removeChild(node.container)
          delete this.nodes[key]
          // dont remove child here, due to we are directly listening on children change
        })

        .with('add', () => {
          const nodeBinding = nodesBinding.get(key) as unknown as YMap<SceneNode> | undefined
          if (!nodeBinding) return
          const NodeType = NodeTypeMap[nodeBinding.get('type')!]
          if (!NodeType) return
          const node = nodeBinding.toJSON()
          const item = new NodeType({
            ...node as any,
            type: undefined,
            binding: nodeBinding,
            page: this,
          })

          this.nodes[node.id] = item
        })

        .with('update', () => {})

        .exhaustive()
    }
  }
}
