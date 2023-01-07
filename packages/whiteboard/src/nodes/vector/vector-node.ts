import { CanvasTextureAllocator } from '@pixi-essentials/texture-allocator'
import type { SVGSceneContext } from '@pixi-essentials/svg'
import { SVGPathNode } from '@pixi-essentials/svg'
import {
  Rect,
  Vector,
  PathData,
  emptyPath,
} from 'vectorial'
import {
  NodeType,
  VectorData,
  SolidPaint,
} from '@vectorial/whiteboard/model'
import {
  type SharedMap,
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
} from '../mixin'
import {
  VectorNode as VectorNodeType,
} from '../types'
import { evenOddFill } from '../utils'
import {
  BindingVectorPath
} from './vector-path'
import {
  drawPath,
} from './utils'



// https://github.dev/ShukantPal/pixi-essentials/blob/v1.1.6/packages/svg/src/SVGScene.ts#L120-L121
const atlas = new CanvasTextureAllocator(2048, 2048)
export const pixiSceneContext: SVGSceneContext = {
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
  public vectorPath: BindingVectorPath
  /**
   * use for redraw while scene viewport scale
   */
  public _sceneScale: number = 1

  constructor(props: VectorNodeProps) {
    const {
      path = emptyPath(),
    } = props
    super({
      ...props,
      type: NodeType.Vector,
    })

    this.container = new SVGPathNode(pixiSceneContext)
    this.container.position.set(this.position.x, this.position.y)

    if (!this.binding.get('path')) {
      this.binding.set('path', toSharedTypes(path))
    }

    this.vectorPath = BindingVectorPath.from(
      path,
      {
        binding: this.binding.get('path')!,
        redraw: this.draw,
      },
    )

    this.updateRelativeTransform()
    this.draw()
  }

  // design for save as serialized, but actually not read used, only for type checking
  public get path(): PathData {
    return this.vectorPath.serialize()
  }

  public get bounds(): Rect {
    const { x, y } = this.position
    const { bounds } = this.vectorPath
    const { width, height } = bounds

    return {
      x: x + bounds.x,
      y: y + bounds.y,
      width,
      height,
    }
  }

  public hitTest(
    viewPoint: Vector,
    padding?: number,
  ): boolean {
    const point = this.toLocalPoint(viewPoint)

    return Boolean(
      this.vectorPath.hitPathTest(point, padding)
      || this.vectorPath.hitAreaTest(point)
    )
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
      path: this.vectorPath.serialize(),
    }
  }

  public clear() {
    this.container.clear()
  }

  public destroy() {
    this.container.destroy()
  }

  public draw = () => {
    const {
      fill,
      stroke,
      _sceneScale,
    } = this

    this.clear()
    if (
      this.removed
      || this.vectorPath.anchors.length < 2
      || this.page.get(this.parent)?.type === NodeType.BooleanOperation
    ) return

    if (this.vectorPath.closed) {
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
            this.vectorPath,
            _sceneScale,
          )
          this.drawEnd()
        })
    }

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
            this.vectorPath,
            _sceneScale,
          )
          this.drawEnd()
        })
    }
  }

  public drawEnd() {
    evenOddFill(this.container)
  }
}

