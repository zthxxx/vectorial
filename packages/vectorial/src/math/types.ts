export interface Vector {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * array index of matrix m
 * ┌─             ─┐    ┌─                   ─┐
 * │ 0,0  0,1  0,2 │    │ x-scale  y-skew   0 │
 * │ 1,0  1,1  1,2 │    │ x-skew   y-scale  0 │
 * │ 2,0  2,1  2,2 │    │ tx       ty       1 │
 * └─             ─┘    └─                   ─┘
 *
 * m[0][2] and m[1][2] are always 0, m[2][2] is always 1, for 2D scene
 */
export type Matrix = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
]
