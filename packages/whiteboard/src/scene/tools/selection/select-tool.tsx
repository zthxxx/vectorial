import { ReactElement } from 'react'
import { isEqual } from 'lodash-es'
import { match } from 'ts-pattern'
import {
  Observable,
  BehaviorSubject,
  from,
  combineLatest,
  asyncScheduler,
} from 'rxjs'
import {
  filter,
  tap,
  throttleTime,
} from 'rxjs/operators'
import {
  interpret,
} from 'xstate'
import {
  Rect,
} from 'vectorial'
import {
  cursor,
} from '@vectorial/whiteboard/assets'
import {
  Arrow,
} from '@vectorial/whiteboard/assets/icon'
import type {
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
  public marquee$: BehaviorSubject<Rect | null>;
  public selected$: BehaviorSubject<string[]>;

  constructor(props: ToolProps) {
    super(props)
    const { scene } = props

    this.interactEvent$ = scene.events.interactEvent$.pipe(
      filter(() => this.isActive),
    )

    this.marquee$ = new BehaviorSubject(null)
    this.selected$ = new BehaviorSubject([])

    combineLatest({
      marquee: this.marquee$,
      selected: this.selected$,
    }).pipe(
      throttleTime(150, asyncScheduler, { trailing: true }),
      tap(this.setAwareness),
    ).subscribe()
  }

  public activate() {
    this.scene.setCursor({ icon: cursor.arrow })
    this.isActive = true
    // @ts-ignore
    this.machine = interpret(createSelectToolMachine(this))
    this.machine!.start()

    from(this.machine!).subscribe({
      complete: () => {
        const state = this.machine!.getSnapshot().value

        match(state)
          .with('editVector', () => {
            this.switchTool('VectorTool')
          })
          .otherwise(() => {})
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
    if (!marquee) {
      this.scene.marquee = marquee
      this.marquee$.next(null)
      return
    }

    this.scene.marquee = marquee
    this.marquee$.next(marquee)
  }

  public setSelected = (selected: Set<SceneNode>) => {
    if (isSameSet(selected, this.scene.selected)) return

    this.scene.selected = selected
    this.selected$.next([...selected].map(node => node.id))
  }

  public get icon(): ReactElement | null {
    return (
      <Arrow className='w-6 h-6' />
    )
  }

  public setAwareness = (change: Partial<UserAwareness>) => {
    const { awareness } = this.scene
    awareness.setLocalState({
      ...awareness.getLocalState(),
      ...change,
    } as UserAwareness)
  }
}
