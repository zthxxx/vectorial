import { proxy, snapshot, subscribe } from 'valtio'
import { bindProxyAndYMap } from 'valtio-yjs'
import { Graphics } from '@pixi/graphics'
import { CanvasTextureAllocator } from '@pixi-essentials/texture-allocator'
import type { Path, SVGSceneContext } from '@pixi-essentials/svg'
import { SVGPathNode, FILL_RULE} from '@pixi-essentials/svg'
import {
  Rect,
  Vector,
  VectorPath,
  PathData,
  emptyPath,
} from 'vectorial'
import {
  NodeType,
  VectorData,
  Color,
  SolidPaint,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
  nanoid,
  toSharedTypes,
  toPixiColor,
} from '@vectorial/whiteboard/utils'
import {
  BaseNodeMixin,
  LayoutMixin,
  BlendMixin,
  GeometryMixin,
  LayoutMixinProps,
} from './mixin'
import {
  VectorNode as VectorNodeType,
} from './types'


// https://github.dev/ShukantPal/pixi-essentials/blob/v1.1.6/packages/svg/src/SVGScene.ts#L120-L121
export const atlas = new CanvasTextureAllocator(2048, 2048)
export const sceneContext: SVGSceneContext = {
  atlas,
  disableHrefSVGLoading: true,
  disableRootPopulation: true,
}

export interface VectorNodeProps extends Partial<VectorData>, LayoutMixinProps {
  binding?: SharedMap<VectorData>;
  path: PathData;
}

export class VectorNode extends GeometryMixin(LayoutMixin(BlendMixin(BaseNodeMixin()))) implements VectorNodeType {
  declare binding: SharedMap<VectorData>
  declare type: NodeType.Vector

  public container: SVGPathNode
  public path: PathData
  public vectorPath: VectorPath

  constructor(props: VectorNodeProps) {
    const {
      path = emptyPath(),
    } = props
    super({
      ...props,
      type: NodeType.Vector,
    })

    this.container = new SVGPathNode(sceneContext)
    this.path = proxy(path)

    /** @TODO two-way binding */
    this.vectorPath = VectorPath.from(path)

    if (!this.binding.get('path')) {
      this.binding.set('path', toSharedTypes(path))
    }

    bindProxyAndYMap(this.path, this.binding.get('path')!)
  }

  public get bounds(): Rect {
    const { width, height } = this.vectorPath.bounds
    return {
      x: 0,
      y: 0,
      width,
      height,
    }
  }

  clone(): VectorNode {
    return new VectorNode({
      ...this.serialize(),
      binding: this.binding.clone(),
      page: this.page,
      id: nanoid(),
    })
  }

  serialize(): VectorData {
    return {
      ...this.serializeBaseData(),
      ...this.serializeLayout(),
      ...this.serializeBlend(),
      ...this.serializeGeometry(),
      type: NodeType.Vector,
      path: snapshot(this.path),
    }
  }

  public hitTest(viewPoint: Vector): boolean {
    const point = this.toLocalPoint(viewPoint)

    return Boolean(
      this.vectorPath.hitPathTest(point)
      || this.vectorPath.hitAreaTest(point)
    )
  }

  public clear() {
    this.container.clear()
  }

  public destroy() {
    this.container.destroy()
  }

  public draw() {
    const { fill, stroke } = this
    this.container.position.set(this.position.x, this.position.y)
    this.clear()

    if (
      this.removed
      || this.page.get(this.parent)?.type === NodeType.BooleanOperation
    ) return

    fill.paints
      .filter(paint => !paint.invisible)
      /** @TODO gradient */
      .filter(paint => paint.type === 'Solid')
      .forEach((paint: SolidPaint) => {
        this.container.beginFill(
          toPixiColor(paint.color),
          paint.opacity,
        )

        drawPath(
          this.container,
          this.path,
        )

        // https://github.com/ShukantPal/pixi-essentials/blob/v1.1.6/packages/svg/src/SVGPathNode.ts#L331-L336
        // @ts-ignore
        const currentPath: Path = this.container.currentPath2
        if (currentPath) {
          currentPath.fillRule = FILL_RULE.EVENODD
          // @ts-ignore
          this.container.drawShape(currentPath);
          // @ts-ignore
          this.container.currentPath2 = null
        }
      })

    if (stroke.width) {
      stroke.paints
        .filter(paint => !paint.invisible)
        /** @TODO gradient */
        .filter(paint => paint.type === 'Solid')
        .forEach((paint: SolidPaint) => {

          this.container.lineStyle({
            width: stroke.width,
            color: toPixiColor(paint.color),
          })
          drawPath(
            this.container,
            this.path,
          )
        })
    }
  }
}

export const drawPath = (
  graphics: Graphics,
  path: PathData,
) => {
  const first = path.anchors[0]
  graphics.moveTo(first.position.x, first.position.y)

  const anchors = path.closed
    ? [...path.anchors, first]
    : path.anchors

  // pixi graphics draw bezier curve
  anchors.reduce((prev, curr) => {
    graphics.bezierCurveTo(
      prev.position.x + (prev.outHandler?.x ?? 0),
      prev.position.y + (prev.outHandler?.y ?? 0),
      curr.position.x + (curr.inHandler?.x ?? 0),
      curr.position.y + (curr.inHandler?.y ?? 0),
      curr.position.x,
      curr.position.y
    )
    return curr
  })

  if (path.closed) {
    graphics.closePath()
  }
}
