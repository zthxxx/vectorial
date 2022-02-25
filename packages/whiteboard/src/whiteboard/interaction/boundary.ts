
import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Graphics } from '@pixi/graphics'
import { Rectangle } from '@pixi/math'
import type { FolderApi, InputBindingApi } from 'tweakpane'


export interface BoundaryToolProps {
  pane: FolderApi;
}

export class BoundaryTool extends Plugin {
  private pane: FolderApi
  public boundaryVisible: boolean = false
  public color: number = 0x18a0fb
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
      label: 'Boundary',
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
    const center = {
      x: viewport.screenWidth / 2,
      y: viewport.screenHeight / 2,
    }
    const crossSize = 5
    const boundary = new Rectangle(
      0,
      0,
      viewport.screenWidth,
      viewport.screenHeight,
    )

    // draw center cross
    this.layer
      .lineStyle({
        width: 2,
        color: 0xffffff,
      })
      .drawShape(boundary)
      .lineStyle({
        width: 1,
        color: this.color,
      })
      .drawShape(boundary)

    // draw boundary arround
    this.layer
      .lineStyle({
        width: 2,
        color: 0xffffff,
      })
      .moveTo(center.x - crossSize, center.y)
      .lineTo(center.x + crossSize, center.y)
      .moveTo(center.x, center.y - crossSize)
      .lineTo(center.x, center.y + crossSize)
      .lineStyle({
        width: 1,
        color: this.color,
      })
      .moveTo(center.x - crossSize, center.y)
      .lineTo(center.x + crossSize, center.y)
      .moveTo(center.x, center.y - crossSize)
      .lineTo(center.x, center.y + crossSize)
  }
}
