import type { Vector } from './types'

const { sqrt, pow } = Math

export const empty = (): Vector => ({ x: 0, y: 0 })

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

export const mirrorVector = (vector: Vector): Vector => scale(vector, -1)

export const mirrorVectorAngle = (vector: Vector, length: number): Vector => {
  return scale(vector, - length / len(vector))
}
