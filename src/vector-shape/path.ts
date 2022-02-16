import type { VectorAnchor } from './anchor'

export class VectorPath {
  public anchors: VectorAnchor[] = []
  public closed: boolean = false

  constructor(anchors: VectorAnchor[] = [], closed: boolean = false) {
    this.anchors = anchors
    this.closed = closed
  }

  public addAnchor(anchor: VectorAnchor, insertIndex?: number) {
    const { length } = this.anchors
    this.anchors.splice(insertIndex ?? length, 0, anchor)
  }
}
