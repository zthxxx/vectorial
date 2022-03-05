import { Graphics } from '@pixi/graphics'
import { Rectangle } from '@pixi/math'
import {
  Vector,
  Rect,
  getInverseMatrix,
  getPointsFromRect,
} from 'vectorial'
import {
  Color,
} from '@vectorial/whiteboard/model'
import {
  LayoutMixin,
} from '@vectorial/whiteboard/nodes/types'
import {
  toPixiColor,
} from '@vectorial/whiteboard/utils'


export const drawArea = (
  graphics: Graphics,
  area?: Vector[],
) => {
  if (!area?.length) return

  const first = area[0]
  graphics.moveTo(first.x, first.y)

  area.forEach(point => graphics.lineTo(point.x, point.y))

  graphics.closePath()
}

export const drawMarquee = (
  marqueeLayer: Graphics,
  color: Color,
  area: Vector[],
) => {
  if (!area) return

  marqueeLayer
    .beginFill(toPixiColor(color), 0.2)
    .lineStyle({
      width: 1,
      color: toPixiColor(color),
    })

  drawArea(marqueeLayer, area)
}

export const getNodesBounds = (nodes: LayoutMixin[]): Rect => {
  if (!nodes.length) return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }

  const topLeft: Vector = { x: Infinity, y: Infinity }
  const rightBottom: Vector = { x: -Infinity, y: -Infinity }

  nodes.forEach(node => {
    const points = getPointsFromRect(node.bounds, node.absoluteTransform)

    points.forEach(point => {
      if (point.x < topLeft.x) topLeft.x = point.x
      if (point.y < topLeft.y) topLeft.y = point.y
      if (point.x > rightBottom.x) rightBottom.x = point.x
      if (point.y > rightBottom.y) rightBottom.y = point.y
    })
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
  area: Vector[],
  color: Color,
  width: number = 1,
) => {
  if (!area.length) return

  boundaryLayer
    .lineStyle({
      width,
      color: toPixiColor(color),
    })
  drawArea(boundaryLayer, area)
}

export const drawCorners = (
  boundaryLayer: Graphics,
  color: Color,
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
      color: toPixiColor(color),
    })
    .drawShape(new Rectangle(left, top, size, size))
    .drawShape(new Rectangle(left, bottom, size, size))
    .drawShape(new Rectangle(right, top, size, size))
    .drawShape(new Rectangle(right, bottom, size, size))
    .endFill()
}

