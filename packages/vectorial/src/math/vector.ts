import type { Vector } from './types'

const { sqrt, pow } = Math

export const emptyVector = (): Vector => ({ x: 0, y: 0 })

export const add = (source: Vector, value: Vector): Vector => ({
  x: source.x + value.x,
  y: source.y + value.y,
})

export const sub = (source: Vector, value: Vector): Vector => ({
  x: source.x - value.x,
  y: source.y - value.y,
})

export const scale = (source: Vector, value: number): Vector => ({
  x: source.x * value,
  y: source.y * value,
})

export const dot = (a: Vector, b: Vector): number => (
  a.x * b.x + a.y * b.y
)

/**
 * cross product of 2D-vector is actually a 3D-vector,
 * like (0, 0, a.x * b.y - a.y * b.x),
 * here only use value of Z-component
 */
export const cross = (a: Vector, b: Vector): number => (
  a.x * b.y - a.y * b.x
)

export const division = (source: Vector, value: number): Vector => {
  if (value === 0) return source
  return {
    x: source.x / value,
    y: source.y / value,
  }
}

const pow2 = (num: number): number => pow(num, 2)

export const len = (vector: Vector): number => (
  sqrt(pow2(vector.x) + pow2(vector.y))
)

export const isNear = (a: Vector, b: Vector, padding: number = 8) =>
  len(sub(a, b)) < padding

export const mirrorVector = (vector: Vector): Vector => scale(vector, -1)

export const mirrorVectorAngle = (vector: Vector, length: number): Vector => {
  return scale(vector, - length / len(vector))
}
