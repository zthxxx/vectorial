import { useEffect, useRef } from 'react'
import { LayerManager } from './layer'
import { Viewport } from './viewport'
import {
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

  plugins.add(
    MouseMonitorTool.name,
    new MouseMonitorTool(viewport.viewport, {
      pane,
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
      pane,
    }),
  )

}


export const Canvas = () => {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!divRef.current) return
    const layerManager = new LayerManager()
    const viewport = new Viewport({
      container: divRef.current,
    })

    setupViewportPlugins(layerManager, viewport)

    return () => {
      viewport.destroy()
    }
  }, [])

  return (
    <div
      className="w-full h-full"
      ref={divRef}
    />
  )
}
