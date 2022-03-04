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
  ChildrenMixinProps,
  LayoutMixin,
  BlendMixin,
} from './mixin'
import {
  FrameNode as FrameNodeType,
} from './types'

export interface FrameNodeProps extends Partial<FrameData>, ChildrenMixinProps {
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
  }

  public get bounds(): Rect {
    const { position, width, height } = this
    return {
      ...position,
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
    this.draw()
  }

  public set height(height: number) {
    this.binding.set('height', height)
    this.draw()
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

  public updateRelativeTransform(): void {
    super.updateRelativeTransform()
    this.draw()
  }

  public hitTest(viewPoint: Vector): boolean {
    const point = this.toLocalPoint(viewPoint)

    return isPointInRect(
      point,
      {
        x: point.x,
        y: point.y - 20,
        width: 40,
        height: 20
      },
    )
  }

  public coverTest(viewRect: Rect): boolean {
    const inverseTransform = getInverseMatrix(this.absoluteTransform)
    const points = getPointsFromRect(this.bounds, inverseTransform)

    return points.every(point => isPointInRect(point, viewRect))
  }

  draw() {
    const {
      bounds,
      graphics,
    } = this

    // super called but not initialized yet
    if (!graphics) return

    this.graphics
      .clear()
      .beginFill(0xffffff)
      .drawRect(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
      )
      .endFill()
  }
}
