import { ReactElement } from 'react'
import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { isEqual, throttle } from 'lodash-es'
import { Observable, from } from 'rxjs'
import {
  filter,
  tap,
} from 'rxjs/operators'
import {
  interpret,
  State,
  StateValue,
} from 'xstate'
import {
  Vector,
  Rect,
  add,
  getInverseMatrix,
  getPointsFromRect,
  applyMatrix,
  applyInverse,
} from 'vectorial'
import {
  cursor,
} from '@vectorial/whiteboard/assets'
import {
  Arrow,
} from '@vectorial/whiteboard/assets/icon'
import {
  InteractEvent,
  EventKeyMatch,
} from '@vectorial/whiteboard/scene'
import {
  UserAwareness,
} from '@vectorial/whiteboard/model'
import {
  SceneNode,
} from '@vectorial/whiteboard/nodes'
import {
  isSameSet,
} from '@vectorial/whiteboard/utils'
import {
  ToolDefine,
  ToolProps,
} from '../types'
import {
  createSelectToolMachine,
} from './state-machine'
import {
  MouseEvent,
  StateEvent,
  StateContext,
  SelectToolService,
} from './types'


export class SelectTool extends ToolDefine {
  public name: string = 'SelectTool'
  public label: string = 'Selection'
  public hotkey: EventKeyMatch = {
    modifiers: [],
    keys: ['KeyV'],
    mouse: [],
  }
  public hotkeyLabel: string = 'V'

  public interactEvent$: Observable<InteractEvent>

  public selectCache = new Set<SceneNode>()

  public machine?: SelectToolService

  constructor(props: ToolProps) {
    super(props)
    const { scene } = props

    this.interactEvent$ = scene.events.interactEvent$.pipe(
      filter(() => this.isActive),
    )
  }

  public activate() {
    this.scene.setCursor({ icon: cursor.arrow })
    this.isActive = true
    // @ts-ignore
    this.machine = interpret(createSelectToolMachine(this))
    this.machine!.start()

    from(this.machine!).subscribe({
      complete: () => {
        const state = this.machine!.state.value
        switch (state) {
          case 'editVector': {
            this.switchTool('VectorTool')
          }
        }
      }
    })
  }

  public deactivate() {
    this.isActive = false

    this.machine?.stop()
    this.selectCache.clear()
    this.scene.hovered = undefined
  }

  public setMarquee = (marquee?: Rect) => {
    if (isEqual(marquee, this.scene.marquee)) return
    const { awareness, viewMatrix } = this.scene
    if (!marquee) {
      this.scene.marquee = marquee
      awareness.setLocalStateField('marquee', marquee)
      return
    }

    const topLeft = applyInverse(marquee, viewMatrix)
    const rightBottom = applyInverse(
      {
        x: marquee.x + marquee.width,
        y: marquee.y + marquee.height,
      },
      viewMatrix,
    )

    const area: Rect = {
      ...topLeft,
      width: rightBottom.x - topLeft.x,
      height: rightBottom.y - topLeft.y,
    }

    this.scene.marquee = marquee
    this.setAwareness({
      marquee: area,
      position: rightBottom,
    })
  }

  public setSelected = (selected: Set<SceneNode>) => {
    if (isSameSet(selected, this.scene.selected)) return

    this.scene.selected = selected
    this.setAwareness({
      selected: [...selected].map(node => node.id),
    })
  }

  public get icon(): ReactElement | null {
    return (
      <Arrow className='w-6 h-6' />
    )
  }

  public setAwareness = throttle((change: Partial<UserAwareness>) => {
    const { awareness } = this.scene
    awareness.setLocalState({
      ...awareness.getLocalState(),
      ...change,
    } as UserAwareness)
  }, 100)
}
