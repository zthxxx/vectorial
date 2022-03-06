import { Graphics } from '@pixi/graphics'
import { CanvasTextureAllocator } from '@pixi-essentials/texture-allocator'
import type { Path, SVGSceneContext } from '@pixi-essentials/svg'
import { SVGPathNode, FILL_RULE} from '@pixi-essentials/svg'
import * as Y from 'yjs'
import {
  Rect,
  Vector,
  VectorPath,
  PathData,
  emptyPath,
  VectorAnchor,
  AnchorData,
} from 'vectorial'
import {
  NodeType,
  VectorData,
  SolidPaint,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
  nanoid,
  toSharedTypes,
  toPixiColor,
} from '@vectorial/whiteboard/utils'
import {
  BaseNodeMixin,
  LayoutMixin,
  BlendMixin,
  GeometryMixin,
  LayoutMixinProps,
} from './mixin'
import {
  VectorNode as VectorNodeType,
} from './types'


// https://github.dev/ShukantPal/pixi-essentials/blob/v1.1.6/packages/svg/src/SVGScene.ts#L120-L121
const atlas = new CanvasTextureAllocator(2048, 2048)
export const pixiSceneContext: SVGSceneContext = {
  atlas,
  disableHrefSVGLoading: true,
  disableRootPopulation: true,
}

export interface VectorNodeProps extends Partial<VectorData>, LayoutMixinProps {
  binding?: SharedMap<VectorData>;
  path: PathData;
}

export class VectorNode extends GeometryMixin(LayoutMixin(BlendMixin(BaseNodeMixin()))) implements VectorNodeType {
  declare binding: SharedMap<VectorData>
  declare type: NodeType.Vector

  public container: SVGPathNode
  public path: PathData
  public vectorPath: VectorPath

  constructor(props: VectorNodeProps) {
    const {
      path = emptyPath(),
    } = props
    super({
      ...props,
      type: NodeType.Vector,
    })

    this.path = path
    this.container = new SVGPathNode(pixiSceneContext)
    this.container.position.set(this.position.x, this.position.y)

    /** @TODO two-way binding */
    this.vectorPath = VectorPath.from(path)

    if (!this.binding.get('path')) {
      this.binding.set('path', toSharedTypes(path))
    }

    this.updateRelativeTransform()
    this.draw()

    this.binding.observeDeep((events, transaction) => {
      events.forEach((event) => this.bindingUpdate(event, transaction))
    })
  }

  public get bounds(): Rect {
    const { x, y } = this.position
    const { bounds } = this.vectorPath
    const { width, height } = bounds

    return {
      x: x + bounds.x,
      y: y + bounds.y,
      width,
      height,
    }
  }

  public hitTest(viewPoint: Vector): boolean {
    const point = this.toLocalPoint(viewPoint)

    return Boolean(
      this.vectorPath.hitPathTest(point)
      || this.vectorPath.hitAreaTest(point)
    )
  }

  clone(): VectorNode {
    return new VectorNode({
      ...this.serialize(),
      binding: this.binding.clone(),
      page: this.page,
      id: nanoid(),
    })
  }

  serialize(): VectorData {
    return {
      ...this.serializeBaseData(),
      ...this.serializeLayout(),
      ...this.serializeBlend(),
      ...this.serializeGeometry(),
      type: NodeType.Vector,
      path: this.vectorPath.serialize(),
    }
  }

  public clear() {
    this.container.clear()
  }

  public destroy() {
    this.container.destroy()
  }

  public draw() {
    const { fill, stroke } = this
    this.clear()
    if (
      this.removed
      || this.vectorPath.anchors.length < 2
      || this.page.get(this.parent)?.type === NodeType.BooleanOperation
    ) return

    if (this.vectorPath.closed) {
      fill.paints
        .filter(paint => !paint.invisible)
        /** @TODO gradient */
        .filter(paint => paint.type === 'Solid')
        .forEach((paint: SolidPaint) => {
          this.container.beginFill(
            toPixiColor(paint.color),
            paint.opacity,
          )

          drawPath(
            this.container,
            this.vectorPath,
          )
          this.drawEnd()
        })
    }

    if (stroke.width) {
      stroke.paints
        .filter(paint => !paint.invisible)
        /** @TODO gradient */
        .filter(paint => paint.type === 'Solid')
        .forEach((paint: SolidPaint) => {
          this.container.lineStyle({
            width: stroke.width,
            color: toPixiColor(paint.color),
          })
          drawPath(
            this.container,
            this.vectorPath,
          )
          this.drawEnd()
        })
    }
  }

  public drawEnd() {
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

  public bindingUpdate = (event: Y.YMapEvent<any>, transaction: Y.Transaction) => {
    const { changes, path, delta, keys } = event

    switch (path.shift()) {
      case undefined: {
        for (const [key, { action }] of keys.entries()) {
          if (action === 'update') {
            switch (key) {
              case 'position': {
                const position = this.binding.get('position')!.toJSON()
                this.container.position.set(position.x, position.y)
                this.updateRelativeTransform()
                this.updateAbsoluteTransform()
                break
              }
              case 'rotation': {
                const rotation = this.binding.get('rotation')!
                this.container.rotation = rotation
                this.updateRelativeTransform()
                this.updateAbsoluteTransform()
                break
              }
            }
          }
        }
        break
      }

      case 'path': {
        const { vectorPath } = this
        switch (path.shift()) {
          case 'anchors': {
            const { anchors } = vectorPath
            if (path.length) {
              const index = path.shift() as number
              const anchor = anchors[index]
              /** update keys for anchor */
              if (!path.length) {
                const point = this.binding.get('path')!.get('anchors')!.get(index)!.toJSON()
                for (const [key, { action }] of keys.entries()) {
                  if (action !== 'update') {
                    this.draw()
                    break
                  }
                  anchor[key] = point[key]
                }
              }
            } else {
              /**
               * we are not set origin in transact manually,
               * so origin will be null in local client, but be Room from remote
               */
              if (!transaction.origin) break

              let current = 0
              for (const item of delta) {
                Object.entries(item).forEach(([key, value]) => {
                  switch (key) {
                    case 'retain': {
                      current += value as number
                      break
                    }
                    case 'insert': {
                      const anchors = (value as Y.Map<any>[])
                        .map(item => VectorAnchor.from(item.toJSON() as AnchorData))
                      anchors.forEach((anchor, i) => {
                        vectorPath.addAnchorAt(anchor, current + i)
                        current += 1
                      })
                    }
                  }
                })
              }
            }
            this.updateRelativeTransform()
            this.updateAbsoluteTransform()
            this.draw()
            break
          }

          case undefined: {
            const path = this.binding.get('path')!
            for (const [key] of keys.entries()) {
              switch (key) {
                case 'rotation':
                case 'parity':
                case 'closed': {
                  vectorPath[key] = path.get(key)!
                  break
                }
                case 'position': {
                  vectorPath[key] = path.get(key)!.toJSON()
                  break
                }
              }
            }

            this.updateRelativeTransform()
            this.updateAbsoluteTransform()
            this.draw()
            break
          }
        }
        break
      }

      default: {
        this.updateRelativeTransform()
        this.updateAbsoluteTransform()
        this.draw()
      }
    }
  }
}

export const drawPath = (
  graphics: Graphics,
  path: VectorPath,
) => {
  const first = path.anchors[0]
  graphics.moveTo(first.position.x, first.position.y)

  const anchors = path.closed
    ? [...path.anchors, first]
    : path.anchors

  // pixi graphics draw bezier curve
  anchors.reduce((prev, curr) => {
    graphics.bezierCurveTo(
      prev.position.x + (prev.outHandler?.x ?? 0),
      prev.position.y + (prev.outHandler?.y ?? 0),
      curr.position.x + (curr.inHandler?.x ?? 0),
      curr.position.y + (curr.inHandler?.y ?? 0),
      curr.position.x,
      curr.position.y
    )
    return curr
  })

  if (path.closed) {
    graphics.closePath()
  }
}
