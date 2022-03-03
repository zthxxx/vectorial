import { useEffect, useRef, RefObject } from 'react'
import { LayerManager } from './interaction/layer'
import {
  EventManager,
  MouseMonitorTool,
  BoundaryTool,
  SelectTool,
  VectorTool,
  Toolbox,
} from './interaction'
import { Pane } from './pane'
import { Viewport } from './viewport'
import { ToolType } from './interaction/toolbox'


export const setupViewportPlugins = ({
  layerManager,
  viewport,
  pane,
}: {
  layerManager: LayerManager,
  viewport: Viewport,
  pane: Pane,
}) => {
  const eventManager = new EventManager(viewport.viewport, {
    element: viewport.canvas,
    pane: pane.lastEvent,
  })

  const plugins = viewport.viewport.plugins
  const { interactionEvent$ } = eventManager

  plugins.add(
    EventManager.name,
    eventManager,
  )

  plugins.add(
    MouseMonitorTool.name,
    new MouseMonitorTool(viewport.viewport, {
      pane: pane.misc,
    }),
  )

  plugins.add(
    BoundaryTool.name,
    new BoundaryTool(viewport.viewport, {
      pane: pane.misc,
    }),
  )

  const toolbox = new Toolbox(viewport.viewport, {
    pane: pane.misc,
    interactionEvent$,
  })

  plugins.add(
    Toolbox.name,
    toolbox,
  )

  plugins.add(
    ToolType.VectorTool,
    new VectorTool(viewport.viewport, {
      toolbox,
      canvas: viewport.canvas,
      renderer: viewport.app.renderer,
      pane: pane.misc,
      layerManager,
      interactionEvent$,
    }),
  )

  plugins.add(
    ToolType.SelectTool,
    new SelectTool(viewport.viewport, {
      pane: pane.misc,
      toolbox,
      layerManager,
      interactionEvent$,
    }),
  )

  toolbox.switchToolByName(ToolType.VectorTool)
}

export const useSetupCanvas = (containerRef: RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (!containerRef.current) return
    const pane = new Pane()
    const viewport = new Viewport({
      container: containerRef.current,
    })
    const layerManager = new LayerManager()

    viewport.viewport.addChild(layerManager.pageLayer)

    setupViewportPlugins({
      layerManager,
      viewport,
      pane,
    })

    return () => {
      viewport.destroy()
    }
  }, [])
}

export const Canvas = () => {
  const divRef = useRef<HTMLDivElement>(null)

  useSetupCanvas(divRef)

  return (
    <div
      className="w-full h-full overflow-hidden"
      ref={divRef}
    />
  )
}