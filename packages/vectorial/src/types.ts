export type {
  Vector,
  Rect,
  Matrix,
} from './math'

export enum HandlerType {
  None = 'None',
  Free = 'Free',
  Mirror = 'Mirror',
  Align = 'Align',
}

export type BooleanOperation = 'unite' | 'intersect' | 'subtract' | 'exclude'
