import { proxy, snapshot } from 'valtio'
import { bindProxyAndYMap } from 'valtio-yjs'
import {
  SharedMap,
  toSharedTypes,
  nanoid,
} from '@vectorial/whiteboard/utils'
import {
  BaseDataMixin,
  Stroke,
  Fill,
  GeometryMixin as GeometryMixinType,
} from '@vectorial/whiteboard/model'
import {
  Constructor,
  EmptyMixin,
  BaseNodeMixin,
} from '../types'

export interface GeometryMixinProps extends Partial<GeometryMixinType>{
}


export const defaultStroke = (): Stroke => ({
  width: 1,
  paints: [{
    id: nanoid(),
    type: 'Solid',
    color: '#c4c4c4',
  }],
})

export const GeometryMixin = <T extends BaseNodeMixin, S extends Constructor<T>>(Super: S) => {
  return class GeometryMixin extends (Super ?? EmptyMixin) implements GeometryMixinType {
    declare binding: SharedMap<BaseDataMixin & GeometryMixinType>;
    public stroke: Stroke;
    public fill: Fill;

    constructor(...args: any[])
    constructor(props: GeometryMixinProps, ...args: any[]) {
      super(props, ...args)
      const {
        fill = { paints: [] },
        stroke = defaultStroke(),
      } = props
      this.fill = proxy(fill)
      this.stroke = proxy(stroke)

      if (!this.binding.get('fill')) {
        this.binding.set('fill', toSharedTypes(fill))
      }

      if (!this.binding.get('stroke')) {
        this.binding.set('stroke', toSharedTypes(stroke))
      }

      bindProxyAndYMap(this.fill, this.binding.get('fill')!)
      bindProxyAndYMap(this.stroke, this.binding.get('stroke')!)
    }

    serializeGeometry(): GeometryMixinType {
      return {
        fill: snapshot(this.fill),
        stroke: snapshot(this.stroke),
      }
    }
  }
}
