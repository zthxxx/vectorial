import { useEffect, useRef, RefObject } from 'react'
import { LayerManager } from './layer'
import {
  EventManager,
  MouseMonitorTool,
  BoundaryTool,
  SelectTool,
  VectorTool,
} from './interaction'
import { Pane } from './pane'
import { Viewport } from './viewport'


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

  plugins.add(
    SelectTool.name,
    new SelectTool(viewport.viewport, {
      pane: pane.misc,
      layerManager,
      interactionEvent$,
    }),
  )

  plugins.add(
    VectorTool.name,
    new VectorTool(viewport.viewport, {
      canvas: viewport.canvas,
      renderer: viewport.app.renderer,
      pane: pane.misc,
      layerManager,
      interactionEvent$,
    }),
  )
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
      className="w-full h-full"
      ref={divRef}
    />
  )
}
