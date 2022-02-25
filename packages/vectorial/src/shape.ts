import { VectorPath } from './path'
import { ShapeStyle } from './style'

export class VectorShape {
  public paths: VectorPath[] = []
  public style: ShapeStyle = {}

  constructor(paths: VectorPath[] = []) {
    this.paths = paths
  }  
}

