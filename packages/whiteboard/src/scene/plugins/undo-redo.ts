import {
  tap,
  filter,
  mergeMap,
  switchMap,
  takeUntil,
} from 'rxjs/operators'
import {
  Vector,
  sub,
  applyMatrix,
  multiply,
  toTranslation,
  toScale,
} from 'vectorial'
import {
  InteractEvent,
  MouseTriggerType,
  KeyTriggerType,
  KeyEvent,
  MouseEvent,
  MouseButton,
} from '../event'
import {
  ScenePlugin,
  ScenePluginProps,
} from './types'

declare module '@vectorial/whiteboard/scene/scene' {
  interface ScenePlugins {
    UndoRedoPlugin?: UndoRedoPlugin;
  }
}

const isPressUndo = (event: InteractEvent): boolean => (
  event.key?.type === KeyTriggerType.Down
  && event.key.trigger === 'KeyZ'
  && event.match({ modifiers: ['Meta'], keys: ['KeyZ'] })
)

const isPressRedo = (event: InteractEvent): boolean => (
  event.key?.type === KeyTriggerType.Down
  && event.key.trigger === 'KeyZ'
  && event.match({ modifiers: ['Meta', 'Shift'], keys: ['KeyZ'] })
)


export class UndoRedoPlugin extends ScenePlugin {
  public name = 'UndoRedoPlugin'

  constructor(props: ScenePluginProps) {
    super(props)
    this.isActive = true

    const { interactEvent$ } = this.scene.events

    interactEvent$.pipe(
      filter(isPressUndo),
      tap(this.undo),
    ).subscribe()

    interactEvent$.pipe(
      filter(isPressRedo),
      tap(this.redo),
    ).subscribe()
  }

  public activate() {}
  public deactivate() {}

  public undo = () => {
    const { undoManager } = this.scene
    undoManager.undo()
  }

  public redo = () => {
    const { undoManager } = this.scene
    undoManager.redo()
  }
}
