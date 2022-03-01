import { Vector } from '.'
import type { Matrix  } from './types'

export const emptyMatrix = (): Matrix => [
  0, 0, 0,
  0, 0, 0,
  0, 0, 0,
]

export const multiply = (left: Matrix, right: Matrix): Matrix => {
  const result: Matrix = emptyMatrix()
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      for (let i = 0; i < 3; i++) {
        result[row * 3 + col] += left[row * 3 + i] * right[i * 3 + col]
      }
    }
  }
  return result
}


export const toTranslation = (tx: number, ty: number): Matrix => [
  1, 0, 0,
  0, 1, 0,
  tx, ty, 1,
]


export const toRotation = (degree: number): Matrix => {
  const radian = degree * Math.PI / 180
  return [
    Math.cos(radian), -Math.sin(radian), 0,
    Math.sin(radian), Math.cos(radian), 0,
    0, 0, 1,
  ]
}

export const toScale = (sx: number, sy: number): Matrix => [
  sx, 0, 0,
  0, sy, 0,
  0, 0, 1,
]

export const applyMatrix = (v: Vector, m: Matrix): Vector => {
  return {
    x: v.x * m[0] + v.y * m[3] + m[6],
    y: v.x * m[1] + v.y * m[4] + m[7],
  }
}

export const applyInverse = (v: Vector, m: Matrix): Vector => {
  const id = 1 / ((m[0] * m[4]) + (m[3] * -m[1]))

  return {
    x: (m[4] * id * v.x) + (-m[3] * id * v.y) + (((m[7] * m[3]) - (m[6] * m[4])) * id),
    y: (m[0] * id * v.y) + (-m[1] * id * v.x) + (((-m[7] * m[0]) + (m[6] * m[1])) * id)
  }
}
