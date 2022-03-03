import { nanoid } from 'nanoid'
import { CanvasTextureAllocator } from '@pixi-essentials/texture-allocator'
import type { Path, SVGSceneContext } from '@pixi-essentials/svg'
import { SVGPathNode, FILL_RULE} from '@pixi-essentials/svg'

import {
  VectorShape,
  VectorPath,
} from 'vectorial'
import {
  PathStyle,
  sceneContext,
  drawPath,
} from './path'

export interface ShapeNodeProps {
  id?: string;
  shape: VectorShape;
  style?: PathStyle;
}

export class ShapeNode {

  public id: string
  public shape: VectorShape
  public container: SVGPathNode

  /**
   * anchor style apply for draw call,
   * if no style, it will be clear
   */
  public style?: PathStyle

  constructor(props: ShapeNodeProps) {
    const {
      id,
      shape,
      style,
    } = props

    this.id = id ?? nanoid(10)
    this.shape = shape
    this.style = style
    this.container = new SVGPathNode(sceneContext)
  }


  public draw() {
    const { style } = this
    this.container.clear()

    if (
      !style
      || (!style.strokeWidth && style.fillColor === undefined)
    ) {
      return
    }

    if (style.strokeWidth) {
      this.container.lineStyle({
        width: style.strokeWidth,
        color: style.strokeColor,
      })
    }

    /**
     * only closed path can be fill,
     * and all paths in union shape always be treat as closed
     */
    if (style.fillColor) {
      this.container.beginFill(style.fillColor)
    }

    this.shape.areas.forEach((path: VectorPath) => {
      drawPath(
        this.container,
        path,
      )
    })

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
}
