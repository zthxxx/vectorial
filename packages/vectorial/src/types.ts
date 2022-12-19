import type { VectorAnchor } from './anchor'
export type {
  Vector,
  Rect,
  Matrix,
} from './math'

export type Constructor<T = {}> = new (...args: any[]) => T;

export class EmptyMixin {
  constructor(...args: any[]) {}
}

export enum HandlerType {
  None = 'None',
  Free = 'Free',
  Mirror = 'Mirror',
  Align = 'Align',
}

export enum BooleanOperator {
  Union = 'Union',
  Subtract = 'Subtract',
  Intersect = 'Intersect',
  Exclude = 'Exclude',
}


export enum PathHitType {
  Anchor = 'Anchor',
  InHandler = 'InHandler',
  OutHandler = 'OutHandler',
  Stroke = 'Stroke',
  Path = 'Path',
  Fill = 'Fill',
  Compound = 'Compound',
}

export interface AnchorHitResult {
  type: PathHitType.Anchor | PathHitType.InHandler | PathHitType.OutHandler;
  point: VectorAnchor;
  ends: [VectorAnchor, VectorAnchor];
  anchorIndex: number;
}

export interface PathHitResult {
  type: PathHitType.Path;
  point: VectorAnchor;
  ends: [VectorAnchor, VectorAnchor];
  /** bezier curve parameter t, range: 0-1*/
  t: number;
  curveIndex: number;
}

export interface AreaHitResult {
  type: PathHitType.Fill;
  point: null
}


export type HitResult = AnchorHitResult | PathHitResult | AreaHitResult;

