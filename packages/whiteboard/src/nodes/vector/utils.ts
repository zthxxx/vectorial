import {
  type Graphics,
  graphicsUtils,
} from '@pixi/graphics'
import type { Polygon } from '@pixi/math'
import {
  VectorPath,
  VectorAnchor,
  BezierCurve,
} from 'vectorial'
import {
  type SharedMap,
  YMap,
  logger,
} from '@vectorial/whiteboard/utils'
import {
  Constructor,
} from '../types'

export interface BindingMixinProps<T extends object = any> {
  binding?: SharedMap<T>
}

export const BindingMixin = <S extends Constructor>(Super: S) => {
  return class BindingMixin extends Super {
    binding: SharedMap<any>

    constructor(...args: any[])
    constructor(props: BindingMixinProps, ...args: any[]) {
      super(props, ...args)

      const {
        binding,
      } = props

      this.binding = (binding ?? new YMap())
    }
  }
}


export const drawPath = (
  graphics: Graphics,
  path: VectorPath,
  /** plot curve sharpness with more segments, base as 1 */
  sharpness: number = 1,
) => {
  if  (path.anchors.length < 2) {
    logger.error('VectorPath cannot have less than 2 anchors', path)
    return
  }

  const first = path.anchors[0]
  graphics.moveTo(first.position.x, first.position.y)

  const anchors = path.closed
    ? [...path.anchors, first]
    : path.anchors

  // pixi graphics draw bezier curve
  anchors.reduce((prev, current) => {
    const points = bezierCurvePoints({
      from: prev,
      to: current,
      sharpness,
    })
    graphics.currentPath.points.push(...points)
    return current
  })

  if (path.closed) {
    graphics.closePath()
  }
}

/**
 * get segment of curve points with scaled length
 *
 * @return flat point's x/y pair: [x1, y2, x2, y2, ...]
 */
const bezierCurvePoints = (params: {
  from: VectorAnchor;
  to: VectorAnchor;
  /** plot curve sharpness with more segments, base as 1 */
  sharpness: number;
}): Polygon['points'] => {
  const {
    from,
    to,
    sharpness,
  } = params

  const points: Polygon['points'] = []

  let curveLength = BezierCurve.getLength({ from, to })

  const count = segmentsCount(curveLength * sharpness)

  for (let i = 1; i <= count; i++) {
    const t = i / count
    const { x, y } = BezierCurve.getPointAtTime({ from, to, t })

    points.push(x, y)
  }

  return points
}

const segmentsCount = (curveLength: number): number => {
  const defaultSegments = 20
  const minSegments = 8
  const maxSegments = 2048
  // maximal length of a single segment of the curve
  const maxSegmentLength = 10

  if (!curveLength || Number.isNaN(curveLength)) {
    return defaultSegments
  }

  const count = Math.ceil(curveLength / maxSegmentLength)

  return Math.min(
    Math.max(count, minSegments),
    maxSegments,
  )
}
