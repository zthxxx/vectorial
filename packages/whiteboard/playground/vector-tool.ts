import type paper from 'paper'
import { view, Path, Point, Color, Tool, Segment } from 'paper'

export interface VectorToolProps {
  path?: paper.Path;
}

export class VectorTool {
  path: paper.Path | undefined
  tool: paper.Tool = new Tool()
  anchor: paper.Path.Circle | undefined
  tangent: paper.Path | undefined
  handleIn: paper.Path.Circle | undefined
  handleOut: paper.Path.Circle | undefined

  constructor(props?: VectorToolProps) {
    this.path = props?.path
  }

  public activate() {
    this.tool.activate()
    this.tool.onMouseDown = this.onMouseDown.bind(this)
    this.tool.onMouseUp = this.onMouseUp.bind(this)
    this.tool.onMouseMove = this.onMouseMove.bind(this)
    this.tool.onMouseDrag = this.onMouseDrag.bind(this)
  }

  public stop() {
    this.tool.remove()
  }

  public initPoint(event: paper.ToolEvent) {
    this.path = new Path()
    this.path.strokeColor = new Color('#00a4ff')
    this.path.strokeWidth = 2
    this.path.add(event.point)
  }

  private onMouseDown(event: paper.ToolEvent) {
    if (this.limit()) return

    if (!this.path) {
      this.initPoint(event)
    }

    this.tangent?.removeSegment(0)
    this.handleIn?.remove()
    this.handleOut?.remove()

    this.tangent = new Path()
    this.tangent.strokeColor = new Color('#00a4ff')
    this.tangent.strokeWidth = 1
    this.tangent.moveTo(event.point)
    this.tangent.lineTo(event.point)

    this.anchor = new Path.Circle(event.point, 3)
    this.anchor.fillColor = new Color('#00a4ff')
    this.anchor.strokeWidth = 1

    this.handleIn = new Path.Circle(event.point, 3)
    this.handleIn.fillColor = new Color('white')
    this.handleIn.strokeWidth = 0.5
    this.handleIn.strokeColor = new Color('#00a4ff')

    this.handleOut = new Path.Circle(event.point, 3)
    this.handleOut.fillColor = new Color('white')
    this.handleOut.strokeWidth = 0.5
    this.handleOut.strokeColor = new Color('#00a4ff')
  }

  private limit(): boolean {
    return (this.path?.segments.length ?? 0) > 5
  }

  private onMouseUp(event: paper.ToolEvent) {
    // if (this.limit()) return

    this.path?.add(new Segment(
      event.point,
    ))
  }

  private onMouseMove(event: paper.ToolEvent) {
    if (this.limit()) {
      const hit = this.path?.hitTest(event.point)
      return
    }

    if (this.path) {
      this.path.segments.at(-1)!.point = event.point
    }
  }

  private onMouseDrag(event: paper.ToolEvent) {

    if (this.limit()) return

    const d = event.point.subtract(this.anchor!.position)

    this.path!.lastSegment.handleOut = d
    this.handleOut!.position = event.point
    this.tangent!.lastSegment.point = event.point

    if (!event.altKey) {
      const handleInPt = this.anchor!.position.subtract(d)

      this.path!.lastSegment.handleIn.set(-d.x, -d.y)
      this.handleIn!.position = handleInPt
      this.tangent!.firstSegment.point = handleInPt
    }
  }
}
