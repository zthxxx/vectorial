import { Graphics } from '@pixi/graphics'
import {
  Rect,
  Vector,
  isPointInRect,
  getPointsFromRect,
  getInverseMatrix,
} from 'vectorial'
import {
  NodeType,
  FrameData,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
  nanoid,
} from '@vectorial/whiteboard/utils'
import {
  BaseNodeMixin,
  ChildrenMixin,
  LayoutMixinProps,
  LayoutMixin,
  BlendMixin,
} from './mixin'
import {
  FrameNode as FrameNodeType,
} from './types'

export interface FrameNodeProps extends Partial<FrameData>, LayoutMixinProps {
  binding?: SharedMap<FrameData>;
}


export class FrameNode extends LayoutMixin(BlendMixin(ChildrenMixin(BaseNodeMixin()))) implements FrameNodeType {
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
    this.draw()

    this.binding.observe(() => {
      this.updateRelativeTransform()
      this.updateAbsoluteTransform()
      this.draw()
    })
  }

  public get bounds(): Rect {
    const { width, height } = this
    return {
      x: 0,
      y: 0,
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
    const points = getPointsFromRect(this.bounds, this.absoluteTransform)
    const cover = points.every(point => isPointInRect(point, viewRect))
    return cover
  }

  draw() {
    const {
      position,
      bounds,
      graphics,
    } = this

    // super called but not initialized yet
    if (!graphics) return

    this.graphics
      .clear()
      .beginFill(0xffffff)
      .drawRect(
        position.x,
        position.y,
        bounds.width,
        bounds.height,
      )
      .endFill()
  }
}
