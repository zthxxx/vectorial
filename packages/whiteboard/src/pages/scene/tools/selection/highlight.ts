
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Rectangle } from '@pixi/math'
import { Vector, Rect } from 'vectorial'

import {
  Color,
  getUidColor,
  currentUserColor,
  filterUserAwareness,
} from '@vectorial/whiteboard/model'

export const highlightNodes = (
  selectLayer: Container,
  nodes: (PathNode | undefined)[],
  style?: PathStyle,
) => {
  selectLayer.removeChildren()
  const paths = nodes.filter(Boolean) as PathNode[]
  if (!paths.length) return
  selectLayer.addChild(...paths.map(node => {
    const path = new PathNode({
      path: node.path,
      style: style ?? highlightStyle,
    })
    path.draw()
    return path.container
  }))
}
