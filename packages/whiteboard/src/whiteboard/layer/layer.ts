import { nanoid } from 'nanoid'
import type { VectorShape } from 'vectorial'


export interface LayerProps {
  id?: string;
  element: VectorShape;
}

export class Layer {
  public id: string
  public element: VectorShape

  constructor(props: LayerProps) {
    const {
      id,
      element,
    } = props
    this.id = id ?? nanoid(10)
    this.element = element
  }

  public destroy() {}
}

export class LayerManager {
  public layerMap: {
    [id: string]: Layer
  } = {}

  constructor(layers?: Layer[]) {
    layers?.forEach(layer => {
      this.add(layer)
    })
  }

  public add(layer: Layer) {
    this.layerMap[layer.id] = layer
  }

  public remove(layer: Layer) {
    if (this.layerMap[layer.id]) {
      layer.destroy()
      delete this.layerMap[layer.id]
    }
  }
}
