import { nanoid } from 'nanoid'
import { Graphics } from '@pixi/graphics'
import type { Path } from '@pixi-essentials/svg'
import { SVGPathNode, FILL_RULE } from '@pixi-essentials/svg'
import { Subject, Subscription } from 'rxjs'
import {
  VectorPath,
  Matrix,
  add,
  applyMatrix,
  emptyVector,
  getInverseMatrix,
  multiply,
} from 'vectorial'
import {
  pixiSceneContext,
  evenOddFill,
} from '@vectorial/whiteboard/nodes'


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
  absoluteTransform: Matrix;
  viewMatrix$: Subject<Matrix>;
}

export enum DefaultPathColor {
  highlight = 0x18a0fb,
  normal = 0xb0b0b0,
}

export class HighlightPathNode {
  public id: string
  public path: VectorPath
  public container: SVGPathNode
  public matrix: Matrix
  public matrix$: Subscription

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
      absoluteTransform,
      viewMatrix$,
    } = props

    this.id = id ?? nanoid(10)
    this.path = path
    this.style = style
    this.container = new SVGPathNode(pixiSceneContext)

    this.matrix = absoluteTransform
    this.matrix$ = viewMatrix$.subscribe(viewMatrix => {
      this.matrix = multiply(absoluteTransform, viewMatrix)
      this.draw()
    })
  }

  public draw() {
    const { style } = this
    this.container.position.set(this.path.position.x, this.path.position.y)
    this.clear()

    if (
      !style
      || (!style.strokeWidth && style.fillColor === undefined)
      || this.path.anchors.length < 2
    ) {
      return
    }

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

    drawPath(
      this.container,
      this.path,
      this.matrix,
    )

    this.drawEnd()
  }

  public drawEnd() {
    evenOddFill(this.container)
  }

  public clear() {
    this.container.clear()
  }

  public destroy() {
    this.container.destroy()
    this.matrix$.unsubscribe()
  }
}


export const drawPath = (
  graphics: Graphics,
  path: VectorPath,
  matrix: Matrix,
) => {
  const first = applyMatrix(path.anchors[0].position, matrix)
  graphics.moveTo(first.x, first.y)

  const anchors = path.closed
    ? [...path.anchors, path.anchors[0]]
    : path.anchors

  // pixi graphics draw bezier curve
  anchors.reduce((prev, curr) => {
    const outHandler = applyMatrix(add(prev.position, prev.outHandler ?? emptyVector()), matrix)
    const inHandler = applyMatrix(add(curr.position, curr.inHandler ?? emptyVector()), matrix)
    const next = applyMatrix(curr.position, matrix)
    graphics.bezierCurveTo(
      outHandler.x,
      outHandler.y,
      inHandler.x,
      inHandler.y,
      next.x,
      next.y
    )
    return curr
  })

  if (path.closed) {
    graphics.closePath()
  }
}
