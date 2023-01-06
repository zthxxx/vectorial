import { Container } from '@pixi/display'
import type {
  Vector,
  Matrix,
  Rect,
  VectorPath,
} from 'vectorial'
import {
  NodeType,
  BaseDataMixin,
  ChildrenDataMixin,
  LayoutDataMixin,
  VectorData,
  BooleanOperationData,
  GroupData,
  FrameData,
  PageData,
  DocumentData,
} from '@vectorial/whiteboard/model'
import { SharedMap } from '@vectorial/whiteboard/utils'

export interface BaseNodeMixin<T extends BaseDataMixin = BaseDataMixin> extends BaseDataMixin {
  binding: SharedMap<T>;
  container: Container;
  /** need a specify type in inherit */
  clone(): BaseNodeMixin<T>;
}

export interface ChildrenMixin<T extends BaseNodeMixin = SceneNode> extends
  ChildrenDataMixin<T> {
    /** for get child node by id mapping in PageNode */
    page: PageNode;

    addChild(child: T): void;
    insertChild(index: number, child: T): void;
    removeChild(child: T): void;
    findChild(predicate: (node: T) => any): T | undefined;
    filterChild(predicate: (node: T) => any): T[];
    forEachChild<K>(predicate: (node: T) => K): K[];
  }

export interface SerializableStaticMixin<
  Node extends BaseNodeMixin = BaseNodeMixin,
  Data extends BaseDataMixin = BaseDataMixin,
> {
  new(): Node;
  from(data: Data): Node;
}

export interface SerializableMixin<
  Data extends BaseDataMixin = BaseDataMixin,
> {
  serialize(): Data;
}

export type Transform = Matrix
export type Mixed = symbol

export interface LayoutMixin extends LayoutDataMixin {
  /** relative to its parent */
  readonly relativeTransform: Transform;
  /** absolute to its PageNode (also scene) */
  readonly absoluteTransform: Transform;
  updateAbsoluteTransform(): void;
  updateRelativeTransform(): void;

  bounds: Rect;
  width: number;
  height: number;
  center: Vector;

  /** absolute to its PageNode without rotation (also scene) */
  readonly absoluteBounds: Rect;

  resize(width: number, height: number): void;
  rescale(scale: number): void;

  moveDelta(viewDelta: Vector): void;

  hitTest(viewPoint: Vector, padding?: number): boolean;
  coverTest(viewRect: Rect): boolean;
}

export interface VectorNode extends
  BaseNodeMixin<VectorData>,
  VectorData,
  LayoutMixin,
  SerializableMixin<VectorData> {
  type: NodeType.Vector;
  clone(): VectorNode;
  vectorPath: VectorPath;
}

export interface BooleanOperationNode extends
  BaseNodeMixin<BooleanOperationData>,
  BooleanOperationData,
  LayoutMixin,
  SerializableMixin<BooleanOperationData>,
  // ChildrenMixin<
  //   | GroupNode
  //   | VectorNode
  //   | BooleanOperationNode
  // >,
  ChildrenMixin {
    type: NodeType.BooleanOperation;
    clone(): BooleanOperationNode;
  }

export interface GroupNode extends
  BaseNodeMixin<GroupNode>,
  GroupData,
  LayoutMixin,
  SerializableMixin<GroupNode>,
  ChildrenMixin {
    type: NodeType.Group;
    clone(): GroupNode;
  }

export interface FrameNode extends
  BaseNodeMixin<FrameData>,
  FrameData,
  LayoutMixin,
  SerializableMixin<FrameData>,
  ChildrenMixin {
    type: NodeType.Frame;
    clone(): FrameNode;
  }

export type SceneNode =
  | FrameNode
  | GroupNode
  | BooleanOperationNode
  | VectorNode

export interface NodeManagerMixin {
  /** only add to node map */
  add(node: BaseNodeMixin): void;
  get(id?: string): BaseNodeMixin | undefined;
  delete(id: string): void;
  insert(
    /** an new node not exist in page */
    node: BaseNodeMixin,
    parent: ChildrenMixin,
    /** fractional-indexing of parent's child, none to insert at top */
    after?: string,
  ): void;
  relocate(
    /** a existed node to be reorder */
    nodes: BaseNodeMixin[],
    parent: ChildrenMixin,
    /** fractional-indexing of parent's child, none to insert at top */
    after?: string,
  ): void;
  find(predicate: (node: BaseNodeMixin) => any): BaseNodeMixin | undefined;
  filter(predicate: (node: BaseNodeMixin) => any): BaseNodeMixin[];
}

export interface PageNode extends
  BaseNodeMixin<PageData>,
  PageData,
  SerializableMixin<PageData>,
  ChildrenMixin<SceneNode>,
  NodeManagerMixin {
    type: NodeType.Page;
    nodes: { [key: SceneNode['id']]: SceneNode };
    clone(): PageNode;
  }

export interface DocumentNode extends
  BaseNodeMixin<DocumentData>,
  DocumentData,
  SerializableMixin<DocumentData>,
  /** @TODO implement insert / relocate */
  Pick<NodeManagerMixin, 'add' | 'get' | 'delete'> {
    type: NodeType.Document;
    pages: { [key: PageNode['id']]: PageNode };
    clone(): DocumentNode;
  }


export type Constructor<T = {}> = new (...args: any[]) => T;

export class EmptyMixin {}
