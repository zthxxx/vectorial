import { ReactElement } from 'react'
import { Plugin } from 'pixi-viewport'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Observable, from } from 'rxjs'
import {
  filter,
  tap,
} from 'rxjs/operators'
import {
  Arrow,
} from '@vectorial/whiteboard/assets/icon'
import {
  InteractEvent,
} from '@vectorial/whiteboard/scene'
import {
  ToolDefine,
  ToolProps,
} from '../types'


export class SelectTool extends ToolDefine {
  public name: string = 'SelectTool'
  public label: string = 'Selection'
  public hotkey: string[] = ['KeyV']
  public hotkeyLabel: string = 'V'

  protected selectLayer: Container
  protected boundaryLayer: Graphics
  protected marqueeLayer: Graphics

  protected interactEvent$: Observable<InteractEvent>

  constructor(props: ToolProps) {
    super(props)
    const { scene } = props

    this.selectLayer = new Container()
    this.boundaryLayer = new Graphics()
    this.marqueeLayer = new Graphics()

    scene.interactLayer.addChild(
      this.selectLayer,
      this.boundaryLayer,
      this.marqueeLayer,
    )

    this.interactEvent$ = scene.events.interactEvent$.pipe(
      filter(() => this.isActive),
    )
  }

  public get icon(): ReactElement | null {
    return (
      <Arrow className='w-6 h-6' />
    )
  }
}
