import {
  BooleanOperator,
} from 'vectorial'
import {
  NodeType,
  newBooleanOperationData,
} from '@vectorial/whiteboard/model'
import type {
  Scene,
  SelectedNodes,
} from '@vectorial/whiteboard/scene'
import {
  ParentNode,
  VectorNode,
  BooleanOperationNode,
} from '@vectorial/whiteboard/nodes'
import {
  toSharedTypes,
  orderNodes,
  getCommonAncestors,
} from '@vectorial/whiteboard/utils'


export const booleanOperate = (
  scene: Scene,
  selected: SelectedNodes,
  operator: BooleanOperator,
) => {
  if (selected.size < 2) {
    const node = [...selected][0] as BooleanOperationNode | undefined
    if (node?.type !== NodeType.BooleanOperation) return
    node.booleanOperator = operator
    node.draw()
    scene.selected = new Set([node])
    return
  }

  if (
    [...selected].some(node => ![NodeType.BooleanOperation, NodeType.Vector].includes(node.type))
  ) return

  const { page } = scene
  const nodes = orderNodes([...selected], page) as (VectorNode | BooleanOperationNode)[]
  const topNode = nodes[nodes.length - 1]
  const geometry = topNode.serializeGeometry()
  const booleanOperationData = newBooleanOperationData({
    booleanOperator: operator,
    geometry,
  })

  scene.docTransact(() => {
    const binding = toSharedTypes(booleanOperationData)
    page.binding.get('nodes')!.set(booleanOperationData.id, binding)

    const booleanOperationNode = new BooleanOperationNode({
      ...booleanOperationData,
      binding,
      page,
    })
    // same with scene.scale, page.container is scene.viewport
    booleanOperationNode._sceneScale = page.container.transform.scale.x

    const parent = getCommonAncestors(nodes, page)[0] as ParentNode ?? page
    page.insert(
      booleanOperationNode,
      parent,
    )

    // move nodes into booleanOperationNode, with id in its children
    page.relocate(nodes, booleanOperationNode)

    // recreate booleanOperation shape
    booleanOperationNode.shape = booleanOperationNode.createShape()
    nodes.forEach(node => node.clear())
    booleanOperationNode.draw()

    scene.selected = new Set([booleanOperationNode])
  })

}
