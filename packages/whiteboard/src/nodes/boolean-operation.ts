import { proxy, snapshot } from 'valtio'
import { bindProxyAndYMap } from 'valtio-yjs'
import { SVGPathNode, FILL_RULE} from '@pixi-essentials/svg'
import {
  Rect,
  Vector,
  VectorPath,
  VectorShape,
  PathData,
  BooleanOperator,
} from 'vectorial'
import {
  NodeType,
  SolidPaint,
  BooleanOperationData,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
  nanoid,
} from '@vectorial/whiteboard/utils'
import {
  BaseNodeMixin,
  LayoutMixin,
  BlendMixin,
  ChildrenMixin,
  GeometryMixin,
  LayoutMixinProps,
} from './mixin'
import {
  BooleanOperationNode as BooleanOperationNodeType,
} from './types'
import {
  sceneContext,
  drawPath,
  toPixiColor,
  VectorNode,
} from './vector-path'

export interface BooleanOperationNodeProps extends Partial<BooleanOperationData>, LayoutMixinProps {
  binding?: SharedMap<BooleanOperationData>;
}

export class BooleanOperationNode
  extends GeometryMixin(LayoutMixin(BlendMixin(ChildrenMixin(BaseNodeMixin()))))
  implements BooleanOperationNodeType {

  declare binding: SharedMap<BooleanOperationData>
  declare type: NodeType.BooleanOperation

  public container: SVGPathNode
  public shape: VectorShape

  constructor(props: BooleanOperationNodeProps) {
    const {
      booleanOperator = BooleanOperator.Union,
    } = props
    super({
      ...props,
      type: NodeType.BooleanOperation,
    })

    this.container = new SVGPathNode(sceneContext)
    this.booleanOperator = booleanOperator

    /** @TODO two-way binding */
    this.shape = new VectorShape({
      booleanOperator,
      children: this.forEachChild(child =>
        (child as BooleanOperationNode).shape
        || (child as VectorNode).vectorPath,
      ),
    })
  }

  public get booleanOperator(): BooleanOperator {
    return this.binding.get('booleanOperator')!
  }

  public set booleanOperator(operator: BooleanOperator) {
    if (this.booleanOperator === operator) return
    this.binding.set('booleanOperator', operator)
  }

  public get bounds(): Rect {
    return this.shape.bounds
  }

  clone(): BooleanOperationNode {
    return new BooleanOperationNode({
      ...this.serialize(),
      binding: this.binding.clone(),
      page: this.page,
      id: nanoid(),
    })
  }

  serialize(): BooleanOperationData {
    return {
      ...this.serializeBaseData(),
      ...this.serializeLayout(),
      ...this.serializeBlend(),
      ...this.serializeGeometry(),
      type: NodeType.BooleanOperation,
      booleanOperator: this.booleanOperator,
      children: [...this.children],
    }
  }

  public hitTest(viewPoint: Vector): boolean {
    const point = this.toLocalPoint(viewPoint)

    return Boolean(
      this.shape.hitPathTest(point)
      || this.shape.hitAreaTest(point)
    )
  }

  public clear() {
    this.container.removeChildren()
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

        this.shape.areas.forEach((path: VectorPath) => {
          drawPath(
            this.container,
            path as PathData,
          )
        })

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

          this.shape.areas.forEach((path: VectorPath) => {
            drawPath(
              this.container,
              path as PathData,
            )
          })
        })
    }
  }
}
