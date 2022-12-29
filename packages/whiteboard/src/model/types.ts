import {
  Vector,
  Matrix,
  Rect,
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
   * [bottom ... top] children item id
   * order fractional-indexing from small to large,
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

export type Color = `#${string}`

export interface BasePaintMixin {
  id: string;
  type: 'Solid' | GradientType;
  /**
   * fractional-indexing for order in parent
   * https://github.com/rocicorp/fractional-indexing
   */
  order?: string;
  invisible?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
}

export interface SolidPaint extends BasePaintMixin {
  type: 'Solid';
  /** rgba color */
  color: Color;
}

export enum GradientType {
  Linear = 'Linear',
  Radial = 'Radial',
}

export interface ColorStop {
  /** relative position 0 - 1 */
  position: number;
  /** rgba color */
  color: Color;
}

export interface GradientPaint extends BasePaintMixin  {
  type: GradientType;
  gradientTransform: Transform;
  gradientStops: ColorStop[];
}

export type Paint = SolidPaint | GradientPaint;

export interface Stroke {
  width: number;
  paints: Paint[];
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
  BaseDataMixin, LayoutDataMixin,
  BlendMixin, GeometryMixin,
  ChildrenDataMixin {
    type: NodeType.Group;
  }

export interface FrameData extends
  BaseDataMixin, LayoutDataMixin,
  BlendMixin, GeometryMixin,
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
  /** use for api authenticate */
  token: string;
}

export interface UserAwareness extends User {
  pageId: string;
  position?: Vector;
  marquee?: Rect | null;
  selected?: SceneNodeData['id'][];
}

export type DocumentMeta = {
  id: DocumentData['id'];
  name: DocumentData['name'];
  /** Y.Doc size for bytes */
  size: number;
}

export type Store = {
  user: User;
  documents: { [id: DocumentData['id']]: DocumentMeta };
  currentDocId: string | null;
  currentPageId: string | null;
}

export type LocalStore = SharedMap<Store>
export type SharedDocument = SharedMap<{
  document: DocumentData;
}>


/** @deprecated */
export type Documents = { [id: DocumentData['id']]: DocumentData }
/** @deprecated */
export type SharedDocuments = SharedMap<Documents>
