import { ReactElement } from 'react'
import { Subscription } from 'rxjs'
import {
  tap,
  filter,
  mergeMap,
  takeUntil,
} from 'rxjs/operators'
import {
  Vector,
  sub,
  applyMatrix,
  multiply,
  toTranslation,
} from 'vectorial'
import {
  cursor,
  icon,
} from '@vectorial/whiteboard/assets'
import {
  type EventKeyMatch,
  type MouseEvent,
  MouseTriggerType,
  MouseButton,
} from '@vectorial/whiteboard/scene'
import {
  ToolProps,
  ToolDefine,
} from '../types'


export class PanTool extends ToolDefine {
  public name: string = 'PanTool'
  public label: string = 'Move Hand'
  public hotkey: EventKeyMatch = {
    modifiers: [],
    keys: ['KeyH'],
    mouse: [],
  }
  public hotkeyLabel: string = 'H'

  private dragBase?: Vector
  private subscription?: Subscription

  constructor(props: ToolProps) {
    super(props)
  }

  public get icon(): ReactElement | null {
    return (
      <icon.Hand className='w-6 h-6' />
    )
  }

  public activate(): void {
    this.isActive = true
    this.scene.setCursor({ state: 'grab'})
    const { interactEvent$ } = this.scene.events

    if (this.subscription) return
    this.subscription = interactEvent$.pipe(
      filter(
        event => event.mouse?.type === MouseTriggerType.Down
        && event.match({ mouse: [MouseButton.Left] })
        && !event.downKeys.has('Space')
      ),
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
  }

  public deactivate(): void {
    this.scene.setCursor({ icon: cursor.arrow })
    this.subscription?.unsubscribe()
    this.subscription = undefined
  }

  public startTranslate = (event: MouseEvent) => {
    const { scene } = this
    if (!event.lastMouse) return
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
    this.scene.setCursor({ state: 'grab'})
  }
}
