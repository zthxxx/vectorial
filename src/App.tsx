import paper, { view, Path, Point, Color } from 'paper'
import { Canvas, drawPath } from './whiteboard'

function App() {
  const render = (canvas: HTMLCanvasElement) => {
    console.log('TCL ~ App ~ canvas', canvas)
    	// Create an empty project and a view for the canvas:
		paper.setup(canvas)
    drawPath()
  }

  return (
    <Canvas
      render={render}
    />
  )
}

export default App
