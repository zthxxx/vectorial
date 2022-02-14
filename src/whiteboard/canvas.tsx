import { useRef, type FC, useEffect } from 'react'

export interface CanvasProps {
  id?: string;
  render?: (canvas: HTMLCanvasElement) => void;
}

export const Canvas: FC<CanvasProps> = (props) => {
  const {
    id,
    render,
  } = props

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    render?.(canvasRef.current)
    return () => {
      canvasRef.current!.remove()
    }
  }, [])

  return (
    <canvas
      className="w-full h-full"
      id={id}
      ref={canvasRef}
    />
  )
}
