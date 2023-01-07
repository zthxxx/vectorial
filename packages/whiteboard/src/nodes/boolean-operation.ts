import { SVGPathNode, FILL_RULE } from '@pixi-essentials/svg'
import { match } from 'ts-pattern'
import * as Y from 'yjs'
import {
  Rect,
  Vector,
  VectorPath,
  VectorShape,
  math,
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
  toPixiColor,
  binding,
  YEventAction,
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
  pixiSceneContext,
  drawPath,
  VectorNode,
  BindingVectorPath,
} from './vector'
import { evenOddFill } from './utils'

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
  /**
   * use for redraw while scene viewport scale
   */
  public _sceneScale: number = 1

  constructor(props: BooleanOperationNodeProps) {
    const {
      booleanOperator = BooleanOperator.Union,
    } = props
    super({
      ...props,
      type: NodeType.BooleanOperation,
    })

    this.container = new SVGPathNode(pixiSceneContext)
    this.container.position.set(this.position.x, this.position.y)
    this.updateRelativeTransform()

    this.booleanOperator = booleanOperator

    /** @TODO two-way binding */
    this.shape = this.createShape()
    this.draw()
  }

  public createShape(): VectorShape {
    return new VectorShape({
      booleanOperator: this.booleanOperator,
      // @TODO more robust and clear
      children: this.forEachChild(child => {
        let shape: VectorShape | VectorPath | undefined = undefined
        if (child instanceof BooleanOperationNode) {
          shape = child.createShape()
        } else if (child instanceof VectorNode) {
          shape = BindingVectorPath.from(
            child.vectorPath.serialize(),
            {
              binding: child.vectorPath.binding,
              redraw: this.draw,
            },
          )
        } else {
          throw new Error(
            `BooleanOperationNode must only contain VectorNodes or BooleanOperationNodes, not ${child.type} (id: ${child.id})`,
          )
        }
        shape.position = math.add(shape.bounds, child.position)
        shape.rotation = shape.rotation + child.rotation
        return shape
      }),
    })
  }

  @binding({
    onChange(operator) {
      this.shape.booleanOperator = operator
    },
    onUpdate({ value: operator, action }) {
      if (action !== YEventAction.Update) return
      this.shape.booleanOperator = operator
      this.draw()
    },
  })
  accessor booleanOperator!: BooleanOperator

  public get bounds(): Rect {
    const { x, y } = this.position
    const { bounds } = this.shape
    const { width, height } = bounds
    return {
      x: x + bounds.x,
      y: y + bounds.y,
      width,
      height,
    }
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

  public hitTest(
    viewPoint: Vector,
    padding?: number
  ): boolean {
    const point = this.toLocalPoint(viewPoint)

    return Boolean(
      this.shape.hitPathTest(point, padding)
      || this.shape.hitAreaTest(point)
    )
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

    this.container.position.set(this.position.x, this.position.y)
    this.clear()

    if (
      this.removed
      || this.page.get(this.parent)?.type === NodeType.BooleanOperation
      || !this.children.length
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
            path,
            _sceneScale,
          )
        })
        this.drawEnd()
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
              path,
              _sceneScale,
            )
          })
          this.drawEnd()
        })
    }
  }

  public drawEnd() {
    evenOddFill(this.container)
  }
}
