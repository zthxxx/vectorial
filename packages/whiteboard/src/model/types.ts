import {
  Vector,
  Matrix,
  PathData,
  BooleanOperator,
} from 'vectorial'
import {
  YMap,
  SharedMap,
} from '@vectorial/whiteboard/utils'


export enum NodeType {
  Document = 'Document',
  Page = 'Page',
  Frame = 'Frame',
  Group = 'Group',
  Vector = 'Vector',
  BooleanOperation = 'BooleanOperation',
}

export interface BaseDataMixin {
  id: string;
  name: string;
  parent?: BaseDataMixin['id'];
  type: NodeType;
  /**
   * fractional-indexing for order in parent
   * https://github.com/rocicorp/fractional-indexing
   */
  order?: string;
  /**
   * for CRDT removed in remote
   */
  removed?: boolean;
}

export interface ChildrenDataMixin<T extends BaseDataMixin = BaseDataMixin> {
  /**
   * order fractional-indexing from small to large
   * a node only can be a child of one parent
   */
  children: Array<T['id']>;
}


export type Transform = Matrix

export interface LayoutDataMixin {
  position: Vector;
  /** rotate degrees anti-clockwise */
  rotation: number;
}

export enum BlendMode {
  PassThrough = 'PassThrough',
  Normal = 'Normal',
}

export interface BlendMixin {
  opacity: number;
  isMask?: boolean;
  blendMode: BlendMode;
}

export interface BasePaintMixin {
  id: string;
  type: 'SOLID' | GradientType;
  /**
   * fractional-indexing for order in parent
   * https://github.com/rocicorp/fractional-indexing
   */
  order?: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
}

export interface SolidPaint extends BasePaintMixin {
  type: 'SOLID';
  /** rgba color */
  color: string;
}

export enum GradientType {
  Linear = 'Linear',
  Radial = 'Radial',
}

export interface ColorStop {
  /** relative position 0 - 1 */
  position: number;
  /** rgba color */
  color: string;
}

export interface GradientPaint extends BasePaintMixin  {
  type: GradientType;
  gradientTransform: Transform;
  gradientStops: ColorStop[];
}

export type Paint = SolidPaint | GradientPaint;

export interface Stroke {
  paints: Paint[];
  width: number;
}

export interface Fill {
  paints: Paint[];
}

export interface GeometryMixin {
  stroke: Stroke;
  fill: Fill;
}

export interface VectorData extends
  BaseDataMixin, LayoutDataMixin,
  BlendMixin, GeometryMixin {
  type: NodeType.Vector;
  path: PathData;
}

export interface BooleanOperationData extends
  BaseDataMixin, LayoutDataMixin,
  BlendMixin, GeometryMixin,
  ChildrenDataMixin {
    type: NodeType.BooleanOperation;
    booleanOperator: BooleanOperator;
  }

export interface GroupData extends
  BaseDataMixin, LayoutDataMixin, BlendMixin,
  ChildrenDataMixin {
    type: NodeType.Group;
  }

export interface FrameData extends
  BaseDataMixin, LayoutDataMixin, BlendMixin,
  ChildrenDataMixin {
    type: NodeType.Frame;
    width: number;
    height: number;
  }


export type SceneNodeData =
  | FrameData
  | GroupData
  | BooleanOperationData
  | VectorData

export interface PageData extends
  BaseDataMixin,
  ChildrenDataMixin<SceneNodeData> {
    type: NodeType.Page;
    nodes: { [key: SceneNodeData['id']]: SceneNodeData };
  }

export interface DocumentData extends
  BaseDataMixin {
    type: NodeType.Document;
    pages: { [key: PageData['id']]: PageData };
  }

export interface User {
  name: string;
  id: string;
}

export interface UserAwareness extends User {
  color: string;
  position: Vector;
  selection: SceneNodeData['id'];
}

export type Store = {
  user: YMap<User>;
  currentDocId: string | null;
  currentPageId: string | null;
}

export type Documents = { [id: string]: DocumentData }

export type LocalStore = YMap<Store>
export type SharedDocuments = SharedMap<Documents>
