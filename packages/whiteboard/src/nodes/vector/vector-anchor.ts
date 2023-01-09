import {
  Vector,
  VectorAnchor,
  VectorAnchorProps,
  AnchorData,
  HandlerType,
} from 'vectorial'
import {
  type SharedMap,
  toSharedTypes,
  binding,
  bindingSetter,
  YEventAction,
} from '@vectorial/whiteboard/utils'
import {
  BindingMixin,
} from './utils'

export interface BindingAnchorProps {
  binding?: SharedMap<AnchorData>
  redraw?: () => void;
}

export class BindingAnchor extends BindingMixin(VectorAnchor) {
  declare binding: SharedMap<AnchorData>
  public redraw?: () => void

  constructor(props: BindingAnchorProps & VectorAnchorProps) {
    super(props)

    const {
      redraw,
    } = props

    this.redraw = redraw
  }

  get position(): Vector {
    return super.position
  }

  @bindingSetter({
    onUpdate({ value, action }) {
      if (action !== YEventAction.Update) return
      this.position = value
      this.redraw?.()
    },
    onChange(position) {
      this.binding.set('position', toSharedTypes(position))
    },
  })
  set position(position: Vector) {
    super.position = position
  }

  @binding({
    onUpdate() {
      this.redraw?.()
    },
  })
  accessor handlerType: HandlerType = HandlerType.None

  get inHandler(): Vector | undefined {
    return super.inHandler
  }

  @bindingSetter({
    onUpdate({ value, action }) {
      if (action !== YEventAction.Update) return
      this.inHandler = value
      this.redraw?.()
    },
    onChange(inHandler) {
      this.binding.set('inHandler', toSharedTypes(inHandler))
    },
  })
  set inHandler(inHandler: Vector | undefined) {
    super.inHandler = inHandler
  }

  get outHandler(): Vector | undefined {
    return super.outHandler
  }

  @bindingSetter({
    onUpdate({ value, action }) {
      if (action !== YEventAction.Update) return
      this.outHandler = value
      this.redraw?.()
    },
    onChange(outHandler) {
      this.binding.set('outHandler', toSharedTypes(outHandler))
    },
  })
  set outHandler(outHandler: Vector | undefined) {
    super.outHandler = outHandler
  }

  public clone(): BindingAnchor {
    return new BindingAnchor({
      binding: this.binding.clone(),
      redraw: this.redraw,
      ...this.serialize(),
    })
  }

  static from(
    anchor: AnchorData,
    props?: BindingAnchorProps,
  ): BindingAnchor {
    const { binding, redraw } = props ?? {}

    return new BindingAnchor({
      binding: binding,
      redraw: redraw,
      ...anchor,
    })
  }
}
