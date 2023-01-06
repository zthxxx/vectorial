import { Graphics } from '@pixi/graphics'
import { match } from 'ts-pattern'
import * as Y from 'yjs'
import {
  Vector,
  VectorPath,
  VectorPathProps,
  PathData,
  VectorAnchor,
  AnchorData,
  PathHitType,
} from 'vectorial'
import {
  type SharedMap,
  type SharedTypes,
  logger,
  binding,
  YEventDeltaType,
  type YMap,
} from '@vectorial/whiteboard/utils'
import { BindingMixin } from './utils'
import {
  BindingAnchor,
} from './vector-anchor'


export interface BindingVectorPathProps {
  binding?: SharedMap<PathData>
  redraw?: () => void;
  anchors?: BindingAnchor[];
}

export class BindingVectorPath extends BindingMixin(VectorPath) {
  declare binding: SharedMap<PathData>
  // @ts-expect-error 'anchors' is defined as an accessor in class
  declare anchors: BindingAnchor[]
  declare hitAnchorTest: (point: Vector, padding?: number) => AnchorHitResult | undefined
  declare hitPathTest: (point: Vector, padding?: number) => PathHitResult | undefined

  public anchorsBinding: Y.Array<SharedTypes<AnchorData>>

  public redraw?: () => void

  constructor(props: VectorPathProps & BindingVectorPathProps) {
    super(props)
    const {
      closed = false,
      redraw,
    } = props

    this.redraw = redraw
    this.anchorsBinding = this.binding.get('anchors')!
    this.closed = closed

    this.anchorsBinding.observe((event, transaction) => {
      // ensure update by remote
      if (!transaction.origin) return
      this.updateAnchors(event)
    })
  }

  @binding({
    onChange(closed) {
      this.path.closed = closed
      this.redraw?.()
    },
    onUpdate({ value }) {
      this.path.closed = value
      this.redraw?.()
    },
  })
  accessor closed: boolean = false

  public addAnchorAt(anchors: BindingAnchor[], insertIndex: number = this.anchors.length) {
    super.addAnchorAt(anchors, insertIndex)
    this.anchorsBinding.insert(insertIndex, anchors.map(anchor => anchor.binding))
    this.redraw?.()
  }

  public removeAnchorAt(index: number, length = 1): void {
    super.removeAnchorAt(index, length)
    this.anchorsBinding.delete(index, length)
    this.redraw?.()
  }

  private updateAnchors({ delta, path, keys }: Y.YEvent<any>) {
    this.binding.doc!.transact(() => {
      let current = 0
      for (const item of delta) {
        Object.entries(item).forEach(([key, value]) => {
          match(key)
            .with(YEventDeltaType.Retain, () => {
              current += value as number
            })
            .with(YEventDeltaType.Insert, () => {
              const anchors = (value as YMap<AnchorData>[])
                .map(item => BindingAnchor.from(
                  item.toJSON() as AnchorData,
                  {
                    binding: this.anchorsBinding?.get(current),
                    redraw: this.redraw,
                  },
                ))

              super.addAnchorAt(anchors, current)
              current += anchors.length
            })
            .with(YEventDeltaType.Delete, () => {
              const len = value as number
              super.removeAnchorAt(current, len)
              current -= len
            })
            .otherwise(() => {})
        })
      }
      this.redraw?.()
    })
  }

  public clone(): BindingVectorPath {
    return new BindingVectorPath(
      {
        binding: this.binding.clone(),
        redraw: this.redraw,
        anchors: this.anchors,
        closed: this.closed,
        position: { ...this.position },
        rotation: this.rotation,
        parity: this.parity,
      },
    )
  }

  static from(
    path: PathData,
    props?: BindingVectorPathProps,
  ): BindingVectorPath {
    const { binding, redraw } = props ?? {}
    const anchorsBinding = binding?.get('anchors')

    return new BindingVectorPath(
      {
        binding: binding,
        redraw: redraw,
        anchors: path.anchors.map((anchor, index) => BindingAnchor.from(
          anchor,
          {
            binding: anchorsBinding?.get(index),
            redraw,
          },
        )),
        closed: path.closed,
        position: { ...path.position },
        rotation: path.rotation,
        parity: path.parity,
      },
    )
  }
}


export const drawPath = (
  graphics: Graphics,
  path: VectorPath,
) => {
  if  (path.anchors.length < 2) {
    logger.error('VectorPath cannot have less than 2 anchors', path)
    return
  }

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

export interface AnchorHitResult {
  type: PathHitType.Anchor | PathHitType.InHandler | PathHitType.OutHandler;
  point: BindingAnchor;
  ends: [BindingAnchor, BindingAnchor];
  anchorIndex: number;
}

export interface PathHitResult {
  type: PathHitType.Path;
  /** new anchor which not exist on the vectorPath */
  point: VectorAnchor;
  ends: [BindingAnchor, BindingAnchor];
  /** bezier curve parameter t, range: 0-1*/
  t: number;
  curveIndex: number;
}
