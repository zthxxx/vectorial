import { useEffect, useRef, RefObject } from 'react'
import { LayerManager } from './layer'
import { Viewport } from './viewport'
import {
  EventManager,
  MouseMonitorTool,
  BoundaryTool,
  SelectingTool,
  VectorTool,
} from './interaction'
import { pane } from './pane'


export const setupViewportPlugins = (
  layerManager: LayerManager,
  viewport: Viewport,
) => {
  const plugins = viewport.viewport.plugins

  const misePane = pane.addFolder({ title: 'Mise' })

  plugins.add(
    MouseMonitorTool.name,
    new MouseMonitorTool(viewport.viewport, {
      pane: misePane,
    }),
  )

  plugins.add(
    VectorTool.name,
    new VectorTool(viewport.viewport, {
      pane,
      renderer: viewport.app.renderer,
    }),
  )

  plugins.add(
    SelectingTool.name,
    new SelectingTool(viewport.viewport, {
      layerManager,
    }),
  )

  plugins.add(
    BoundaryTool.name,
    new BoundaryTool(viewport.viewport, {
      pane: misePane,
    }),
  )

  plugins.add(
    EventManager.name,
    new EventManager(viewport.viewport, {
      pane,
    })
  )
}

export const useSetupCanvas = (containerRef: RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (!containerRef.current) return
    const layerManager = new LayerManager()
    const viewport = new Viewport({
      container: containerRef.current,
    })

    setupViewportPlugins(layerManager, viewport)

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
