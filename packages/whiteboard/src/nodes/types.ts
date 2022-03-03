import type {
  Vector,
  Matrix,
  Rect,
  VectorPath,
} from 'vectorial'

export enum NodeType {
  Document = 'Document',
  Page = 'Page',
  Frame = 'Frame',
  Group = 'Group',
  Vector = 'Vector',
  BooleanOperation = 'BooleanOperation',
}

export interface BaseNodeMixin {
  id: string;
  name: string;
  parent?: BaseNodeMixin['id'];
  type: NodeType;
  /**
   * fractional-indexing for order in parent
   * https://github.com/rocicorp/fractional-indexing
   */
  order?: string;
  /**
   * for CRDT
   */
  removed: boolean;
  /** need a specify type in inherit */
  clone(): BaseNodeMixin;
}

export interface ChildrenMixin<T extends BaseNodeMixin = BaseNodeMixin> {
  /**
   * order fractional-indexing from small to large
   */
  children: T['id'][];

  addChild(child: T): void;
  insertChild(child: T, index: number): void;
  removeChild(child: T): void;
  find(predicate: (node: T) => any): T | undefined;
  filter(predicate: (node: T) => any): T[];
}

export interface SerializableMixin<T extends BaseNodeMixin = BaseNodeMixin> {
  serialize(): Object;
  /** that's static method */
  from(data: Object): T;
}

export type Transform = Matrix
export type Mixed = symbol

export interface LayoutMixin {
  /** relative to its parent */
  relativeTransform: Transform;
  /** absolute to its PageNode */
  absoluteTransform: Transform;
  position: Vector;
  /** rotate degrees anti-clockwise */
  rotation: number;

  width: number;
  height: number;
  absoluteBounds: Rect;
  resize(width: number, height: number): void;
  rescale(scale: number): void;
}

export enum BlendMode {
  PassThrough = 'PassThrough',
  Normal = 'Normal',
}

export interface BlendMixin {
  opacity: number;
  isMask: boolean;
  blendMode: BlendMode;
}

export interface VectorNode extends
  BaseNodeMixin, LayoutMixin,
  SerializableMixin<VectorNode> {
  type: NodeType.Vector;
  clone(): VectorNode;
  vectorPath: VectorPath;
}

export type BooleanOperation = 'unite' | 'intersect' | 'subtract' | 'exclude'
export enum BooleanOperator {
  Union = 'union',
  Intersect = 'intersect',
  Subtract = 'subtract',
  Exclude = 'exclude',
}

export interface BooleanOperationNode extends
  BaseNodeMixin, LayoutMixin,
  SerializableMixin<BooleanOperationNode>,
  ChildrenMixin<
    | GroupNode
    | VectorNode
    | BooleanOperationNode
  > {
    type: NodeType.BooleanOperation;
    clone(): BooleanOperationNode;

    booleanOperator: BooleanOperator;
  }

export interface GroupNode extends
  BaseNodeMixin, LayoutMixin,
  SerializableMixin<GroupNode>,
    ChildrenMixin {
    type: NodeType.Group;
    clone(): GroupNode;
  }

export interface FrameNode extends
  BaseNodeMixin, LayoutMixin,
  SerializableMixin<FrameNode>,
    ChildrenMixin {
    type: NodeType.Frame;
    clone(): FrameNode;
  }

export interface PageNode extends
  BaseNodeMixin, SerializableMixin<PageNode>,
  ChildrenMixin {
    type: NodeType.Page;
    clone(): PageNode;
  }

