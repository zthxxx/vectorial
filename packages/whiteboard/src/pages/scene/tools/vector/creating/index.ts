
import {
  cursor,
} from '@vectorial/whiteboard/assets'
import type { StateAction, GuardAction } from '../types'

export * from './indicating'
export * from './adjusting'
export * from './createdConfirming'

export const enterCreating: GuardAction = (interactEvent$, context) => {
  const {
    scene,
    indicativeAnchor,
    indicativePath,
    changes,
  } = context

  scene.setCursor({ icon: cursor.pen })
  changes.push([indicativeAnchor, { anchor: 'normal', inHandler: undefined, outHandler: undefined }])
  changes.push([indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }])

  // @TODO: Listening to keyboard event, like 'ESC' and 'Enter'
  interactEvent$.pipe(

  ).subscribe()
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/CSS/cursor#values
 */
export const exitCreating: StateAction = ({ scene }) => scene.setCursor({ icon: cursor.arrow })
