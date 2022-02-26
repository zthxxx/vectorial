
import { Graphics } from '@pixi/graphics'
import {
  VectorPath,
} from 'vectorial'

export interface PathDrawProps {
  path: VectorPath;
  style?: {
    fillColor?: number;
    strokeWidth?: number;
    strokeColor?: number;
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
    fillColor?: number;
    strokeWidth?: number;
    strokeColor?: number;
  }

  constructor(props: PathDrawProps) {
    const {
      path,
      style,
    } = props

    this.path = path
    this.style = style
    this.container = new Graphics()
  }

  public draw() {
    const { style } = this
    this.clear()

    if (
      !style
      || (!style.strokeWidth && !style.fillColor)
      || this.path.anchors.length < 2
    ) {
      return
    }

    const first = this.path.anchors[0]

    if (style.strokeWidth) {
      this.container.lineStyle({
        width: style.strokeWidth,
        color: style.strokeColor,
      })
    }

    // only closed path can be fill
    if (style.fillColor && this.path.closed) {
      this.container.beginFill(style.fillColor)
    }

    this.container.moveTo(first.position.x, first.position.y)

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

    if (this.path.closed) {
      this.container.closePath()
    }
  }

  public clear() {
    this.container.clear()
  }

  public destroy() {
    this.path.anchors = []
    this.container.destroy()
  }
}
