import { nanoid } from 'nanoid'
import { CanvasTextureAllocator } from '@pixi-essentials/texture-allocator'
import type { Path, SVGSceneContext } from '@pixi-essentials/svg'
import { SVGPathNode, FILL_RULE} from '@pixi-essentials/svg'
import {
  VectorPath,
} from 'vectorial'

// https://github.dev/ShukantPal/pixi-essentials/blob/v1.1.6/packages/svg/src/SVGScene.ts#L120-L121
const atlas = new CanvasTextureAllocator(2048, 2048)
const sceneContext: SVGSceneContext = {
  atlas,
  disableHrefSVGLoading: true,
  disableRootPopulation: true,
}


/**
 * @TODO that interface is temporary
 */
export interface PathStyle {
  fillColor?: number;
  fillAlpha?: number;
  strokeWidth?: number;
  strokeColor?: number;
}

export interface PathNodeProps {
  id?: string;
  path: VectorPath;
  style?: PathStyle;
}

export enum DefaultPathColor {
  highlight = 0x18a0fb,
  normal = 0xb0b0b0,
}

export class PathNode {
  public id: string
  public path: VectorPath
  public container: SVGPathNode

  /**
   * anchor style apply for draw call,
   * if no style, it will be clear
   */
   public style?: PathStyle

  constructor(props: PathNodeProps) {
    const {
      id,
      path,
      style,
    } = props

    this.id = id ?? nanoid(10)
    this.path = path
    this.style = style
    this.container = new SVGPathNode(sceneContext)
  }

  public draw() {
    const { style } = this
    this.clear()

    if (
      !style
      || (!style.strokeWidth && style.fillColor === undefined)
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

    // https://github.com/ShukantPal/pixi-essentials/blob/v1.1.6/packages/svg/src/SVGPathNode.ts#L331-L336
    // @ts-ignore
    const currentPath: Path = this.container.currentPath2
    if (currentPath) {
      currentPath.fillRule = FILL_RULE.EVENODD
      // @ts-ignore
      this.container.drawShape(currentPath);
      // @ts-ignore
      this.container.currentPath2 = null
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
