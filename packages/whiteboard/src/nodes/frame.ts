import { Graphics } from '@pixi/graphics'
import * as Y from 'yjs'
import {
  Rect,
  Vector,
  isPointInRect,
  getPointsFromRect,
} from 'vectorial'
import {
  NodeType,
  FrameData,
  SolidPaint,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
  nanoid,
  toPixiColor,
} from '@vectorial/whiteboard/utils'
import {
  BaseNodeMixin,
  ChildrenMixin,
  LayoutMixinProps,
  LayoutMixin,
  BlendMixin,
  GeometryMixin,
} from './mixin'
import {
  FrameNode as FrameNodeType,
  BaseNodeMixin as BaseNodeMixinType,
  LayoutMixin as LayoutMixinType,
} from './types'

export interface FrameNodeProps extends Partial<FrameData>, LayoutMixinProps {
  binding?: SharedMap<FrameData>;
}


export class FrameNode
  extends GeometryMixin(LayoutMixin(BlendMixin(ChildrenMixin(BaseNodeMixin()))))
  implements FrameNodeType {

  declare binding: SharedMap<FrameData>
  declare type: NodeType.Frame

  public graphics: Graphics

  constructor(props: FrameNodeProps) {
    const {
      width = 0,
      height = 0,
    } = props
    super({
      ...props,
      type: NodeType.Frame,
    })
    this.binding.set('width', width)
    this.binding.set('height', height)

    this.graphics = new Graphics()
    this.container.addChild(this.graphics)

    this.updateRelativeTransform()
    this.draw()

    this.binding.observe(this.bindingUpdate)
  }

  public get bounds(): Rect {
    const { x, y } = this.position
    const { width, height } = this
    return {
      x,
      y,
      width,
      height,
    }
  }

  public get width(): number {
    return this.binding.get('width')!
  }

  public get height(): number {
    return this.binding.get('height')!
  }

  public set width(width: number) {
    this.binding.set('width', width)
  }

  public set height(height: number) {
    this.binding.set('height', height)
  }

  clone(): FrameNode {
    return new FrameNode({
      ...this.serialize(),
      binding: this.binding.clone(),
      page: this.page,
      id: nanoid(),
    })
  }

  serialize(): FrameData {
    return {
      ...this.serializeBaseData(),
      ...this.serializeLayout(),
      ...this.serializeBlend(),
      ...this.serializeGeometry(),
      type: NodeType.Frame,
      width: this.width,
      height: this.height,
      children: [...this.children],
    }
  }

  public hitTest(viewPoint: Vector): boolean {
    const point = this.toLocalPoint(viewPoint)

    const hit = isPointInRect(
      point,
      {
        x: 0,
        y: -15,
        width: 80,
        height: 15
      },
    )

    return hit
  }

  public coverTest(viewRect: Rect): boolean {
    const parent = this.page.get(this.parent) as BaseNodeMixinType & LayoutMixinType
    const points = getPointsFromRect(this.bounds, parent?.absoluteTransform)
    const cover = points.every(point => isPointInRect(point, viewRect))
    return cover
  }

  public draw() {
    const {
      width,
      height,
      fill,
      stroke,
      graphics,
    } = this

    graphics.clear()

    fill.paints
      .filter(paint => !paint.invisible)
      /** @TODO gradient */
      .filter(paint => paint.type === 'Solid')
      .forEach((paint: SolidPaint) => {
        graphics
          .beginFill(
            toPixiColor(paint.color),
            paint.opacity,
          )
          .drawRect(
            0,
            0,
            width,
            height,
          )
          .endFill()
      })

    if (stroke.width) {
      stroke.paints
        .filter(paint => !paint.invisible)
        /** @TODO gradient */
        .filter(paint => paint.type === 'Solid')
        .forEach((paint: SolidPaint) => {
          graphics
            .lineStyle({
              width: stroke.width,
              color: toPixiColor(paint.color),
            })
            .drawRect(
              0,
              0,
              width,
              height,
            )
        })
      }
  }

  public bindingUpdate = (event: Y.YMapEvent<any>) => {
    const { changes, path, delta, keys } = event

    for (const [key, { action }] of keys.entries()) {
      if (action === 'update') {
        switch (key) {
          case 'position': {
            const position = this.binding.get('position')!.toJSON()
            this.container.position.set(position.x, position.y)
            this.updateRelativeTransform()
            this.updateAbsoluteTransform()
            break
          }
          case 'rotation': {
            const rotation = this.binding.get('rotation')!
            this.container.rotation = rotation
            this.updateRelativeTransform()
            this.updateAbsoluteTransform()
            break
          }
          case 'width':
          case 'height': {
            this.draw()
            break
          }
        }
      }
    }
  }
}
