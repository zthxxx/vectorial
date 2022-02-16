import { useEffect, useRef } from 'react'
import paper from 'paper'
import { drawPath } from './draw-path'

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    paper.setup(canvasRef.current)
    drawPath()
  }, [])

  return (
    <canvas
      className="w-full h-full"
      ref={canvasRef}
    />
  )
}
