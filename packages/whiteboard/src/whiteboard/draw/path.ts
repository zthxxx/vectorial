
import { Graphics } from '@pixi/graphics'
import {
  VectorPath,
} from 'vectorial'

export interface PathDrawProps {
  path: VectorPath;
  style?: {
    width?: number;
    color?: number;
  };
}

export enum DefaultPathColor {
  highlight = 0x18a0fb,
  normal = 0xb0b0b0,
}

export class PathDraw {
  public path: VectorPath
  public container: Graphics

  /**
   * anchor style apply for draw call,
   * if no style, it will be clear
   */
   public style?: {
    width: number;
    color: number;
  }

  constructor(props: PathDrawProps) {
    const {
      path,
      style: {
        width = 1,
        color = DefaultPathColor.normal,
      } = {},
    } = props

    this.path = path
    this.style = {
      width,
      color,
    }
    this.container = new Graphics()
  }

  public draw() {
    const { style } = this
    this.clear()

    if (
      !style
      || style.width <= 0
      || this.path.anchors.length < 2
    ) {
      return
    }

    const first = this.path.anchors[0]

    this.container
      .lineStyle({
        width: style.width,
        color: style.color,
      })
      .moveTo(first.position.x, first.position.y)

    const anchors = this.path.closed
      ? [...this.path.anchors, first]
      : this.path.anchors

    // pixi graphics draw bezier curve
    anchors.reduce((prev, curr) => {
      this.container.bezierCurveTo(
        prev.position.x + (prev.outHandler?.x ?? 0),
        prev.position.y + (prev.outHandler?.y ?? 0),
        curr.position.x + (curr.inHandler?.x ?? 0),
        curr.position.y + (curr.inHandler?.y ?? 0),
        curr.position.x,
        curr.position.y
      )
      return curr
    })
  }

  public clear() {
    this.container.clear()
  }

  public destroy() {
    this.path.anchors = []
    this.container.destroy()
  }
}
