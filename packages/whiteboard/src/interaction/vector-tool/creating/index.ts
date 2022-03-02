import { icon } from '../../../assets'
import type { StateAction } from '../types'
import { setCanvasCursor } from '../utils'

export * from './indicating'
export * from './adjusting'
export * from './createdConfirming'

export const enterCreating: StateAction = ({
  canvas,
  indicativeAnchor,
  lastMousePosition,
  changes,
}) => {
  setCanvasCursor(canvas, icon.pen)
  indicativeAnchor.vectorAnchor.position = lastMousePosition
  changes.push([indicativeAnchor, { anchor: 'normal', inHandler: undefined, outHandler: undefined }])

  // @TODO: Listening to keyboard event, like 'ESC' and 'Enter'
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/CSS/cursor#values
 */
export const exitCreating: StateAction = ({ canvas }) => setCanvasCursor(canvas)
