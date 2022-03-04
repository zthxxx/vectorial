import { Matrix as PixiMatrix } from '@pixi/math'
import {
  Matrix,
} from 'vectorial'

export const fromPixiMatrix = (m: PixiMatrix): Matrix => ([
  [m.a, m.b, 0],
  [m.c, m.d, 0],
  [m.tx, m.ty, 1],
])


export const toPixiMatrix = (m: Matrix): PixiMatrix => new PixiMatrix(
  m[0][0],
  m[0][1],
  m[1][0],
  m[1][1],
  m[2][0],
  m[2][1],
)

