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



export const NodeTypeMap = {
  [NodeType.Frame]: FrameNode,
  [NodeType.Group]: undefined,
  [NodeType.Vector]: VectorNode,
  [NodeType.BooleanOperation]: undefined,
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
}
