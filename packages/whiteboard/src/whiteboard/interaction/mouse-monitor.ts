import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import type { InteractionEvent } from '@pixi/interaction'
import type { FolderApi, MonitorBindingApi } from 'tweakpane'


export interface MovePluginProps {
  pane: FolderApi;
}

export class MouseMonitorTool extends Plugin {
  private pane: FolderApi
  public mousePoint: string = '(0, 0)'
  private mouseBlade: MonitorBindingApi<string>

  constructor(parent: Viewport, options: MovePluginProps) {
    const {
      pane,
    } = options
    super(parent)
    this.pane = pane

    this.mouseBlade = this.pane.addMonitor(this, 'mousePoint', {
      label: 'Mouse',
      interval: 0,
    })
  }

  public move(e: InteractionEvent): boolean {
    const point = e.data.global
    this.mousePoint = `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`
    this.mouseBlade.refresh()
    return false
  }
}
