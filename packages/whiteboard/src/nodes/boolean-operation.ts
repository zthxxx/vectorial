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
} from './vector-path'
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

    this.binding.observeDeep((events, transaction) => {
      /**
       * we are not set origin in transact manually,
       * so origin will be null in local client, but be Room from remote
       */
      if (!transaction.origin) return

      events.forEach((event) => this.bindingUpdate(event))
    })
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
          shape = child.vectorPath.clone()
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

  public get booleanOperator(): BooleanOperator {
    return this.binding.get('booleanOperator')!
  }

  public set booleanOperator(operator: BooleanOperator) {
    if (this.booleanOperator === operator) return
    this.binding.set('booleanOperator', operator)
    /** @TODO two-way binding */
    this.shape.booleanOperator = operator
  }

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

  public hitTest(viewPoint: Vector): boolean {
    const point = this.toLocalPoint(viewPoint)

    return Boolean(
      this.shape.hitPathTest(point)
      || this.shape.hitAreaTest(point)
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
            )
          })
          this.drawEnd()
        })
    }
  }

  public drawEnd() {
    evenOddFill(this.container)
  }

  public bindingUpdate = (event: Y.YEvent<any>) => {
    const { changes, path, delta, keys } = event

    match(path.shift())
      .with(undefined, () => {
        for (const [key, { action }] of keys.entries()) {
          if (action === 'update') {
            match(key)
              .with('position', () => {
                const position = this.binding.get('position')!.toJSON()
                this.container.position.set(position.x, position.y)
                this.updateRelativeTransform()
                this.updateAbsoluteTransform()
              })

              .with('rotation', () => {
                const rotation = this.binding.get('rotation')!
                this.container.rotation = rotation
                this.updateRelativeTransform()
                this.updateAbsoluteTransform()
              })

              .with('booleanOperator', () => {
                const booleanOperator = this.binding.get('booleanOperator')!
                this.shape.booleanOperator = booleanOperator
              })

              .otherwise(() => {})
          }
        }
      })

      .otherwise(() => {})

    this.draw()
  }
}
