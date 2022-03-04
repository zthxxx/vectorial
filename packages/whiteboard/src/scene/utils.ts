import { Matrix as PixiMatrix } from '@pixi/math'
import {
  Matrix,
} from 'vectorial'

export const fromPixiMatrix = (m: PixiMatrix): Matrix => ([
  [m.a, m.b, 0],
  [m.c, m.d, 0],
  [m.tx, m.ty, 1],
])
