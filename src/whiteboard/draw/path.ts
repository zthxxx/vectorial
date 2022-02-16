
import { Graphics } from '@pixi/graphics'
import {
  VectorPath,
} from "../../vector-shape"

export interface PathDrawProps {
  path: VectorPath;
  color?: number;
}

export class EditingPathDraw {
  public path: VectorPath
  public color: number
  public container: Graphics

  constructor(props: PathDrawProps) {
    const {
      path,
      color = 0x18a0fb,
    } = props

    this.path = path
    this.color = color
    this.container = new Graphics()
  }

  public draw() {
    this.container.clear()

    if (!this.path.anchors.length) {
      return
    }

    const first = this.path.anchors[0]

    this.container
      .lineStyle({
        width: 1,
        color: this.color,
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
    this.container.clear()
  }

  public destroy() {
    this.container.destroy()
  }
}
