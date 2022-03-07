import {
  PageNode,
  SceneNode,
} from '@vectorial/whiteboard/nodes'

export const getAncestors = (node: SceneNode, page: PageNode): SceneNode[] => {
  const ancestors: SceneNode[] = []
  let parent = page.get(node.parent)
  while (parent) {
    ancestors.unshift(parent)
    parent = page.get(parent.parent)
  }
  return ancestors
}

export const getCommonAncestors = (nodes: SceneNode[], page: PageNode): SceneNode[] => {
  const ancestorsList: SceneNode[][] = nodes.map(node => getAncestors(node, page))
  const commonAncestors: SceneNode[] = []

  let index = 0
  while (ancestorsList.every(ancestors => ancestors[index])) {
    const ancestors = new Set(ancestorsList.map(ancestors => ancestors[index].id))
    if (ancestors.size === 1) {
      commonAncestors.unshift(ancestorsList[0][index])
    } else {
      return commonAncestors
    }
    index += 1
  }
  return commonAncestors
}

/**
 * order nodes to [bottom ... top]
 */
export const orderNodes = (nodes: SceneNode[], page: PageNode): SceneNode[] => {
  const ordered: SceneNode[] = [...nodes]
  return ordered.sort((a, b) => {
    const ancestorsA = getAncestors(a, page)
    const ancestorsB = getAncestors(b, page)
    for (let index = 0; index < ancestorsA.length; index++) {
      const ancestorA = ancestorsA[index]
      const ancestorB = ancestorsB[index]
      if (!ancestorB) {
        return ancestorA.order! < b.order! ? -1 : 1
      }
      if (ancestorA.id === ancestorB.id) {
        continue
      }
      return ancestorA.order! < ancestorB.order! ? -1 : 1
    }
    return a.order! < b.order! ? -1 : 1
  })
}
