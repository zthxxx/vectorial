import { nanoid } from 'nanoid'
import { Container } from '@pixi/display'
import {
  PathNode,
} from '../../nodes'

type LayerNode = PathNode

export class LayerManager {
  public layerMap: {
    [id: string]: LayerNode
  } = {}
  public layers: LayerNode[]
  public selected: Set<LayerNode>

  public pageLayer: Container
  public nodesLayer: Container
  public interactLayer: Container

  constructor(layers: LayerNode[] = []) {
    this.layers = layers
    this.layers.forEach(layer => {
      this.addLayer(layer)
    })
    this.selected = new Set()

    this.pageLayer = new Container()
    this.nodesLayer = new Container()
    this.interactLayer = new Container()

    this.pageLayer.addChild(
      this.nodesLayer,
      this.interactLayer,
    )
  }

  public addLayer(layer: LayerNode) {
    this.layerMap[layer.id] = layer
    this.layers.unshift(layer)
  }

  public getLayer(id: LayerNode['id']): LayerNode | undefined {
    return this.layerMap[id]
  }

  public remove(layer: LayerNode) {
    if (this.layerMap[layer.id]) {
      this.selected.delete(this.layerMap[layer.id])
      layer.destroy()
      delete this.layerMap[layer.id]
    }
  }

  public filter(predicate: (layer: LayerNode) => boolean): LayerNode[] {
    return Object.values(this.layers).filter(predicate)
  }

  public find(predicate: (layer: LayerNode) => boolean): LayerNode | undefined {
    return Object.values(this.layers).find(predicate)
  }

  public forEach(callback: (layer: LayerNode) => void) {
    this.layers.forEach(callback)
  }

  public select(layers: LayerNode[]) {
    this.selected.clear()
    layers.forEach(layer => {
      this.selected.add(layer)
    })
  }
}
