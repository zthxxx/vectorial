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
    ViewportPlugin?: ViewportPlugin;
  }
}

const isPressSpace = (event: InteractEvent): boolean => (
  event.key?.type === KeyTriggerType.Down
  && event.match({ modifiers: [], keys: ['Space'] })
)

const isReleaseSpace = (event: InteractEvent): boolean => (
  event.key?.type === KeyTriggerType.Up
  && event.key.trigger === 'Space'
)

const isPressDrag = (event: InteractEvent): boolean => (
  event.mouse?.type === MouseTriggerType.Down
  && (
    event.match({ modifiers: [], keys: ['Space'] })
    || event.match({ mouse: [MouseButton.Middle] })
  )
)

export class ViewportPlugin extends ScenePlugin {
  private dragBase?: Vector
  private lastCursor?: string
  public name = 'ViewportPlugin'

  constructor(props: ScenePluginProps) {
    super(props)
    this.isActive = true

    const { interactEvent$ } = this.scene.events

    interactEvent$.pipe(
      filter(isPressSpace),
      tap(this.translateHint),
      switchMap(() => interactEvent$.pipe(
        filter(isReleaseSpace),
        tap(this.endTranslateHint),
      )),
    ).subscribe()

    interactEvent$.pipe(
      filter(isPressDrag),
      tap(this.startTranslate),
      mergeMap(() => interactEvent$.pipe(
        filter(event => event.mouse?.type === MouseTriggerType.Move),
        tap(this.translate),
        takeUntil(interactEvent$.pipe(
          filter(event => event.mouse?.type === MouseTriggerType.Up),
          tap(this.endTranslate),
        )),
      ))
    ).subscribe()

    interactEvent$.pipe(
      filter(event => event.mouse?.type === MouseTriggerType.Wheel),
      tap((event: MouseEvent) => {
        if (event.metaKey || event.ctrlKey) this.scale(event)
        else this.scroll(event)
      }),
    ).subscribe()

    /**
     * @TODO Ctrl + -/+, Ctrl + 0, focus on center
     */
  }

  /**
   * ViewportPlugin is always active
   */
  public activate() {}
  public deactivate() {}


  public storeCursor = () => {
    if (this.lastCursor) return
    this.lastCursor = this.scene.getCursor()
  }

  public restoreCursor = () => {
    this.scene.setCursor({ state: this.lastCursor })
    this.lastCursor = undefined
  }

  public translateHint = () => {
    this.storeCursor()
    this.scene.setCursor({ state: 'grab'})
  }

  public endTranslateHint = (event: KeyEvent) => {
    if (event.downMouse.size === 0) {
      this.restoreCursor()
    }
  }

  public startTranslate = (event: MouseEvent) => {
    const { scene } = this
    if (!event.lastMouse) return
    this.storeCursor()
    scene.setCursor({ state: 'grabbing'})
    this.dragBase = applyMatrix(event.lastMouse, scene.viewMatrix)
  }

  public translate = (event: MouseEvent) => {
    if (!this.dragBase) return
    if (!event.lastMouse) return
    const { scene } = this
    const current = applyMatrix(event.lastMouse, scene.viewMatrix)
    const delta = sub(current, this.dragBase)
    this.dragBase = current
    scene.viewMatrix = multiply(
      scene.viewMatrix,
      toTranslation(delta.x, delta.y),
    )
  }

  public endTranslate = (event: MouseEvent) => {
    this.dragBase = undefined
    if (event.downKeys.has('Space')) {
      this.scene.setCursor({ state: 'grab'})
    } else {
      this.restoreCursor()
    }
  }

  public scroll = (event: MouseEvent) => {
    const delta = event.mouse
    const { scene } = this
    scene.viewMatrix = multiply(
      scene.viewMatrix,
      toTranslation(- delta.x / 2, - delta.y / 2),
    )
  }

  public scale = (event: MouseEvent) => {
    if (!event.lastMouse) return
    const { viewport, viewMatrix } = this.scene
    const mouse = applyMatrix(event.lastMouse, viewMatrix)
    const delta = event.mouse

    const currentScale = viewport.scale.y
    // scroll y axis for scale
    const scaleDelta = 1 - delta.y / 150

    if (currentScale * scaleDelta < 0.1) return
    if (currentScale * scaleDelta > 10) return

    this.scene.viewMatrix = multiply(
      viewMatrix,
      toTranslation(-mouse.x, -mouse.y),
      // scroll y axis for scale
      toScale(scaleDelta, scaleDelta),
      toTranslation(mouse.x, mouse.y),
    )
  }
}
