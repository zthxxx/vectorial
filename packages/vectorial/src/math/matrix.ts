import { Vector } from '.'
import type { Matrix } from './types'

export const emptyMatrix = (): Matrix => [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
]

export const identityMatrix = (): Matrix => [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

export const toTranslation = (tx: number, ty: number): Matrix => [
  [1, 0, 0],
  [0, 1, 0],
  [tx, ty, 1],
]

export const toRotation = (degree: number): Matrix => {
  const radian = degree * Math.PI / 180
  return [
    [Math.cos(radian), -Math.sin(radian), 0],
    [Math.sin(radian), Math.cos(radian), 0],
    [0, 0, 1],
  ]
}

export const toScale = (sx: number, sy: number): Matrix => [
  [sx, 0, 0],
  [0, sy, 0],
  [0, 0, 1],
]

/**
 * array index of matrix m
 * ┌─             ─┐    ┌─                   ─┐
 * │ 0,0  0,1  0,2 │    │ x-scale  y-skew   0 │
 * │ 1,0  1,1  1,2 │    │ x-skew   y-scale  0 │
 * │ 2,0  2,1  2,2 │    │ tx       ty       1 │
 * └─             ─┘    └─                   ─┘
 * usually, m[2] and m[5] are always 0, m[8] is always 1, for 2D sence
 */
export const multiply = (...matrixes: (Matrix | undefined)[]): Matrix => {
  const chain = matrixes.filter(Boolean) as Matrix[]
  if (chain.length === 0) return identityMatrix()

  return chain.reduce((left, right) => {
    const result: Matrix = emptyMatrix()
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        for (let i = 0; i < 3; i++) {
          result[row][col] += left[row][i] * right[i][col]
        }
      }
    }
    return result
  })
}

/**
 * vector * matrix
 *
 *                    ┌─             ─┐
 *                    │ 0,0  0,1  0,2 │
 * { x, y, z: 1 }  *  │ 1,0  1,1  1,2 │
 *                    │ 2,0  2,1  2,2 │
 *                    └─             ─┘
 */
export const applyMatrix = (v: Vector, m: Matrix): Vector => {
  return {
    x: v.x * m[0][0] + v.y * m[1][0] + m[2][0],
    y: v.x * m[0][1] + v.y * m[1][1] + m[2][1],
  }
}

/**
 * vector * Matrix(-1)
 * ┌─       ─┐  ┌─             ─┐
 * │ 0  1  2 │  │ 0,0  0,1  0,2 │
 * │ 3  4  5 │  │ 1,0  1,1  1,2 │
 * │ 6  7  8 │  │ 2,0  2,1  2,2 │
 * └─       ─┘  └─             ─┘
 *
 */
export const applyInverse = (v: Vector, m: Matrix): Vector => {
  /** 1 / det(m) */
  const id = 1 / ((m[0][0] * m[1][1]) - (m[1][0] * m[0][1]))

  return {
    x: (m[1][1] * id * v.x) + (-m[1][0] * id * v.y) + (((m[2][1] * m[1][0]) - (m[2][0] * m[1][1])) * id),
    y: (m[0][0] * id * v.y) + (-m[0][1] * id * v.x) + (((-m[2][1] * m[0][0]) + (m[2][0] * m[0][1])) * id)
  }
}

export const getInverseMatrix = (m: Matrix): Matrix => {
  const det = (m[0][0] * m[1][1]) - (m[1][0] * m[0][1])
  const id = 1 / det
  return [
    [m[1][1] * id, -m[1][0] * id, 0],
    [-m[0][1] * id, m[0][0] * id, 0],
    [((m[2][1] * m[1][0]) - (m[2][0] * m[1][1])) * id, ((-m[2][1] * m[0][0]) + (m[2][0] * m[0][1])) * id, 1],
  ]
}

export const decomposeMatrix = (m: Matrix): {
  translation: Vector,
  rotation: number,
  scale: Vector,
} => {
  const det = m[0][0] * m[1][1] - m[1][0] * m[0][1]
  const r = Math.sqrt(m[0][0] * m[0][0] + m[0][1] * m[0][1])
  const translation: Vector = { x: m[2][0], y: m[2][1] }

  if (r === 0) {
    return {
      translation,
      rotation: 0,
      scale: { x: 1, y: 1 },
    }
  }

  const radian = Math.acos(m[0][0] / r) * (m[0][1] < 0 ? -1 : 1)
  const scale = {
    x: r,
    y: det / r,
  }

  return {
    translation,
    rotation: radian * 180 / Math.PI,
    scale,
  }
}

export const transposeMatrix = (m: Matrix): Matrix => {
  const result: Matrix = emptyMatrix()
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      result[row][col] = m[col][row]
    }
  }
  return result
}
