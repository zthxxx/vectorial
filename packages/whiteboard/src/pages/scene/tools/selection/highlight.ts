
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Rectangle } from '@pixi/math'
import { Vector, Rect } from 'vectorial'
import {
  PathNode,
  PathStyle,
  DefaultPathColor,
} from '../../nodes'


export const getNodesBounds = (nodes: PathNode[]): Rect => {
  if (!nodes.length) return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }

  const topLeft: Vector = { x: Infinity, y: Infinity }
  const rightBottom: Vector = { x: -Infinity, y: -Infinity }
  nodes.forEach(node => {
    const bounds = node.path.bounds
    if (bounds.x < topLeft.x) topLeft.x = bounds.x
    if (bounds.y < topLeft.y) topLeft.y = bounds.y
    const right = bounds.x + bounds.width
    const bottom = bounds.y + bounds.height
    if (right > rightBottom.x) rightBottom.x = right
    if (bottom > rightBottom.y) rightBottom.y = bottom
  })

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rightBottom.x - topLeft.x,
    height: rightBottom.y - topLeft.y,
  }
}

export const drawBounds = (
  boundaryLayer: Graphics,
  bounds: Rect,
) => {
  if (!bounds.width || !bounds.height) return

  const boundary = new Rectangle(
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  )
  boundaryLayer
    .lineStyle({
      width: 1,
      color: highlightStyle.strokeColor,
    })
    .drawShape(boundary)
}

export const drawCorners = (
  boundaryLayer: Graphics,
  bounds: Rect,
) => {
  if (!bounds.width || !bounds.height) return
  const size = 6
  const top = bounds.y - size / 2
  const left = bounds.x - size / 2
  const right = bounds.x + bounds.width - size / 2
  const bottom = bounds.y + bounds.height - size / 2

  boundaryLayer
    .beginFill(0xffffff)
    .lineStyle({
      width: 1,
      color: highlightStyle.strokeColor,
    })
    .drawShape(new Rectangle(left, top, size, size))
    .drawShape(new Rectangle(left, bottom, size, size))
    .drawShape(new Rectangle(right, top, size, size))
    .drawShape(new Rectangle(right, bottom, size, size))
    .endFill()
}

export const drawSelection = (
  boundaryLayer: Graphics,
  nodes: PathNode[],
) => {
  const bounds = getNodesBounds(nodes)
  boundaryLayer.clear()
  drawBounds(boundaryLayer, bounds)
  /** @TODO support resize */
  //drawCorners(boundaryLayer, bounds)
}


export const highlightStyle: PathStyle = {
  fillColor: undefined,
  strokeColor: DefaultPathColor.highlight,
  strokeWidth: 1,
}

export const hoverStyle: PathStyle = {
  ...highlightStyle,
  strokeWidth: 2,
}


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
