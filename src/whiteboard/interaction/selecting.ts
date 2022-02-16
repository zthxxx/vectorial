import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import type { InteractionEvent } from '@pixi/interaction'
import type { LayerManager } from '../layer'

export interface SelectingToolProps {
  layerManager: LayerManager;
}

export class SelectingTool extends Plugin {
  private layerManager: LayerManager

  constructor(parent: Viewport, props: SelectingToolProps) {
    const {
      layerManager,
    } = props
    super(parent)
    this.layerManager = layerManager
  }
}
