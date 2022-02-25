import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Container } from '@pixi/display'
import type { LayerManager } from '../layer'

export interface ElementsLayerProps {
  layerManager: LayerManager;
}

export class ElementsLayer extends Plugin {
  private layerManager: LayerManager
  private container: Container

  constructor(parent: Viewport, props: ElementsLayerProps) {
    const {
      layerManager,
    } = props
    super(parent)
    this.layerManager = layerManager
    this.container = new Container()
    this.parent.addChild(this.container)
  }
}
