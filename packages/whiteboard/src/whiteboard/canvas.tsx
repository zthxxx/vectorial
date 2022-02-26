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

  const misePane = pane.addFolder({ title: 'Misc' })

  const eventManager = new EventManager(viewport.viewport, {
    pane,
  })
  const { interactionEvent$ } = eventManager

  plugins.add(
    MouseMonitorTool.name,
    new MouseMonitorTool(viewport.viewport, {
      pane: misePane,
    }),
  )

  plugins.add(
    EventManager.name,
    eventManager,
  )

  plugins.add(
    VectorTool.name,
    new VectorTool(viewport.viewport, {
      canvas: viewport.canvas,
      pane: misePane,
      renderer: viewport.app.renderer,
      interactionEvent$,
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
