// Cubic Bezier curve
import {
  Vector,
} from './types'
import type {
  VectorAnchor,
} from './anchor'


export class BezierCurve {
  static getPointAtTime(params: {
    from: VectorAnchor;
    to: VectorAnchor;
    /** bezier param `time`, [0 - 1] */
    t: number;
  }): Vector {
    const {
      from,
      to,
      t,
    } = params

    const { fromX, fromY, cpX, cpY, cpX2, cpY2, toX, toY } = {
      fromX: from.position.x,
      fromY: from.position.y,
      // from anchor control point
      cpX: from.position.x + (from.outHandler?.x ?? 0),
      cpY: from.position.y + (from.outHandler?.y ?? 0),
      // target anchor control point
      cpX2: to.position.x + (to.inHandler?.x ?? 0),
      cpY2: to.position.y + (to.inHandler?.y ?? 0),
      toX: to.position.x,
      toY: to.position.y,
    }

    const t2 = t * t
    const t3 = t2 * t
    const nt = 1 - t
    const nt2 = nt * nt
    const nt3 = nt2 * nt

    // point x/y in bezier curve at t time
    return {
      x: (nt3 * fromX) + (3.0 * nt2 * t * cpX) + (3.0 * nt * t2 * cpX2) + (t3 * toX),
      y: (nt3 * fromY) + (3.0 * nt2 * t * cpY) + (3 * nt * t2 * cpY2) + (t3 * toY),
    }
  }


  static getLength(params: {
    from: VectorAnchor;
    to: VectorAnchor;
  }): number {
    const {
      from,
      to,
    } = params

    let curveLength = 0
    let prevX = from.position.x
    let prevY = from.position.y

    // iteration count
    const n = 10

    for (let i = 1; i <= n; i++) {
      const t = i / n

      // point x/y in bezier curve at t time
      const { x, y } = BezierCurve.getPointAtTime({ from, to, t })

      const dx = prevX - x
      const dy = prevY - y
      prevX = x
      prevY = y

      curveLength += Math.sqrt((dx * dx) + (dy * dy))
    }

    return curveLength
  }
}
