
import { Graphics } from '@pixi/graphics'
import {
  VectorPath,
} from 'vectorial'

export interface PathDrawProps {
  path: VectorPath;
  width?: number;
  color?: number;
}

export enum DefaultPathColor {
  highlight = 0x18a0fb,
  normal = 0xb0b0b0,
}

export class PathDraw {
  public path: VectorPath
  public color: number
  public width: number
  public container: Graphics

  constructor(props: PathDrawProps) {
    const {
      path,
      width = 1,
      color = DefaultPathColor.highlight,
    } = props

    this.path = path
    this.width = width
    this.color = color
    this.container = new Graphics()
  }

  public draw({ width, color }: { width?: number, color?: number } = {}) {
    this.container.clear()

    if (!this.path.anchors.length) {
      return
    }

    const first = this.path.anchors[0]

    this.container
      .lineStyle({
        width: width ?? this.width,
        color: color ?? this.color,
      })
      .moveTo(first.position.x, first.position.y)

    // pixi graphics draw bezier curve
    this.path.anchors.reduce((prev, curr) => {
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
    this.path.anchors = []
    this.container.clear()
  }

  public destroy() {
    this.path.anchors = []
    this.container.destroy()
  }
}
