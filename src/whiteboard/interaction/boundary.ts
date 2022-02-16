
import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Circle, Rectangle } from '@pixi/math'
import type { Pane, InputBindingApi } from 'tweakpane'


export interface BoundaryToolProps {
  pane: Pane;
}

export class BoundaryTool extends Plugin {
  private pane: Pane
  public boundaryVisible: boolean = false
  private boundaryBlade: InputBindingApi<unknown, boolean>
  private layer: Graphics

  constructor(parent: Viewport, options: BoundaryToolProps) {
    const {
      pane,
    } = options
    super(parent)
    this.pane = pane

    const viewport = this.parent

    this.layer = new Graphics()
    this.changeVisibility(this.boundaryVisible)
    viewport.addChild(this.layer)

    this.boundaryBlade = pane.addInput(this, 'boundaryVisible', {
      label: 'boundary',
    })
    this.boundaryBlade.on('change', ({ value }) => {
      this.changeVisibility(value)
    })
  }

  public changeVisibility(visible: boolean) {
    this.boundaryVisible = visible
    if (visible) {
      this.drawBoundary()
    } else {
      this.layer.clear()
    }
  }

  public drawBoundary() {
    const viewport = this.parent

    this.layer
      .lineStyle({
        width: 1,
        color: 0x18a0fb,
      })
      .drawShape(
        new Rectangle(
          0,
          0,
          viewport.screenWidth,
          viewport.screenHeight,
        ),
      )

    this.layer
      .lineStyle({
        width: 1,
        color: 0x18a0fb,
      })
      .drawShape(
        new Circle(
          viewport.screenWidth / 2,
          viewport.screenHeight / 2,
          4,
        ),
      )
  }
}
