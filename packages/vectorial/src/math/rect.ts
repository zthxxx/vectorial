import {
  Vector,
  Rect,
  Matrix,
} from './types'
import {
  applyMatrix,
} from './matrix'

export const isPointInRect = (point: Vector, rect: Rect): boolean => (
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height
)

export const polygonsIntersectTest = (polygonA: Vector[], polygonB: Vector[]): boolean => {
  const polygons: Vector[][] = [polygonA, polygonB];

  for (let i = 0; i < polygons.length; i++) {

      // for each polygon, look at each edge of the polygon, and determine if it separates
      // the two shapes
      const polygon = polygons[i];
      for (let i1 = 0; i1 < polygon.length; i1++) {

          // grab 2 vertices to create an edge
          const i2 = (i1 + 1) % polygon.length;
          const p1 = polygon[i1];
          const p2 = polygon[i2];

          // find the line perpendicular to this edge
          const normal = { x: p2.y - p1.y, y: p1.x - p2.x };

          let minA: number = Infinity
          let maxA: number = -Infinity
          // for each vertex in the first shape, project it onto the line perpendicular to the edge
          // and keep track of the min and max of these values
          for (let j = 0; j < polygonA.length; j++) {
              const projected = normal.x * polygonA[j].x + normal.y * polygonA[j].y;
              if (!isFinite(minA) || projected < minA) {
                  minA = projected;
              }
              if (!isFinite(maxA) || projected > maxA) {
                  maxA = projected;
              }
          }

          // for each vertex in the second shape, project it onto the line perpendicular to the edge
          // and keep track of the min and max of these values

          let minB: number = Infinity
          let maxB: number = -Infinity
          for (let j = 0; j < polygonB.length; j++) {
              const projected = normal.x * polygonB[j].x + normal.y * polygonB[j].y;
              if (!isFinite(minB) || projected < minB) {
                  minB = projected;
              }
              if (!isFinite(maxB) || projected > maxB) {
                  maxB = projected;
              }
          }

          // if there is no overlap between the projects, the edge we are looking at separates the two
          // polygons, and we know there is no overlap
          if (maxA < minB || maxB < minA) {
              return false;
          }
      }
  }
  return true;
}

export const getPointsFromRect = (rect: Rect, transform?: Matrix): Vector[] => {
  const { x, y, width, height } = rect
  const points = [
    { x: x, y: y },
    { x: x + width, y: y },
    { x: x + width, y: y + height },
    { x: x, y: y + height },
  ]
  return points.map(point => transform ? applyMatrix(point, transform) : point)
}

export const rectCoverTest = (rect: Rect, target: Rect, transform: Matrix): boolean => {
  return polygonsIntersectTest(
    getPointsFromRect(rect),
    getPointsFromRect(target, transform),
  )
}
