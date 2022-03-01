import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import {
  Subject,
  fromEvent,
  merge,
} from 'rxjs'
import {
  tap,
  map,
  filter,
} from 'rxjs/operators'
import type { FolderApi, MonitorBindingApi } from 'tweakpane'


export enum MouseButton {
  Left,
  Middle,
  Right,
}

export enum KeyTriggerType {
  Down = 'Down',
  Up = 'Up',
}

export enum MouseTriggerType {
  Down = 'Down',
  Move = 'Move',
  Up = 'Up',
  Wheel = 'Wheel',
}

export type ModifierKey = 'Ctrl' | 'Alt' | 'Shift' | 'Meta'

export class InteractionEvent {
  /**
   * pressed modifier keys
   */
  public modifiers: Set<ModifierKey>
  /**
   * keyboard pressed keys without modifiers
   * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
   */
  public downKeys: Set<string>
  /**
   * pressed mouse buttons
   */
  public downMouse: Set<MouseButton>

  public key?: {
    /**
     * key event trigger type
     */
    type: KeyTriggerType;
    /**
     * keyboard press/release key code
     * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
     */
    trigger: string;
  }
  public mouse?: {
    /**
     * mouse position (x, y) for mouse down/up/move
     * delta (x, y) for mouse wheel
     */
    x: number;
    y: number;
    /**
     * mouse event trigger type
     */
    type: MouseTriggerType;
    /**
     * mouse event (include release) trigger button
     */
    trigger: MouseButton;
  }

  constructor() {
    this.modifiers = new Set()
    this.downKeys = new Set()
    this.downMouse = new Set()
  }

  get ctrlKey(): boolean {
    return this.modifiers.has('Ctrl')
  }
  set ctrlKey(press: boolean) {
    this.changeModifier('Ctrl', press)
  }

  get altKey(): boolean {
    return this.modifiers.has('Alt')
  }
  set altKey(press: boolean) {
    this.changeModifier('Alt', press)
  }

  get shiftKey(): boolean {
    return this.modifiers.has('Shift')
  }
  set shiftKey(press: boolean) {
    this.changeModifier('Shift', press)
  }

  get metaKey(): boolean {
    return this.modifiers.has('Meta')
  }
  set metaKey(press: boolean) {
    this.changeModifier('Meta', press)
  }

  get mouseLeft(): boolean {
    return this.downMouse.has(MouseButton.Left)
  }
  get mouseMiddle(): boolean {
    return this.downMouse.has(MouseButton.Middle)
  }
  get mouseRight(): boolean {
    return this.downMouse.has(MouseButton.Right)
  }

  private changeModifier(modifier: ModifierKey, press: boolean) {
    if (press) {
      this.modifiers.add(modifier)
    } else {
      this.modifiers.delete(modifier)
    }
  }

  public clone(): InteractionEvent {
    const event = new InteractionEvent()
    event.modifiers = new Set(this.modifiers)
    event.downKeys = new Set(this.downKeys)
    event.downMouse = new Set(this.downMouse)
    return event
  }

  public match({ modifiers, keys, mouse }: {
    modifiers?: ModifierKey[],
    keys?: string[],
    mouse?: MouseButton[],
  }): boolean {
    if (!modifiers && !keys && !mouse) {
      return false
    }

    if (modifiers && !isSameSet(this.modifiers, new Set(modifiers))) {
      return false
    }

    if (keys && !isSameSet(this.downKeys, new Set(keys))) {
      return false
    }

    if (mouse && !isSameSet(this.downMouse, new Set(mouse))) {
      return false
    }

    return true
  }
}

export interface EventManagerProps {
  pane: FolderApi;
}

export class EventManager extends Plugin {
  private _lastEvent?: InteractionEvent
  public interactionEvent$: Subject<InteractionEvent>
  private modifierBlade: MonitorBindingApi<string>
  private mouseEventBlade: MonitorBindingApi<string>
  private keyEventBlade: MonitorBindingApi<string>
  private paneState: {
    modifier: string;
    mouse: string;
    key: string;
  }

  /**
   * modifyer key code defined in `KeyboardEvent.code`
   * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
   */
  static modifierKeys = new Set([
    'ControlLeft',
    'ControlRight',
    'ShiftLeft',
    'ShiftRight',
    'AltLeft',
    'AltRight',
    'MetaLeft',
    'MetaRight',
  ])

  constructor(parent: Viewport, { pane }: EventManagerProps) {
    super(parent)

    this.paneState = {
      modifier: '',
      mouse: '',
      key: '',
    }

    const paneFolder = pane.addFolder({ title: 'Last Event' })

    this.mouseEventBlade = paneFolder.addMonitor(this.paneState, 'mouse', {
      label: 'Mouse',
      interval: 0,
    })

    this.keyEventBlade = paneFolder.addMonitor(this.paneState, 'key', {
      label: 'Keyboard',
      interval: 0,
    })

    this.modifierBlade = paneFolder.addMonitor(this.paneState, 'modifier', {
      label: 'Modifier',
      interval: 0,
    })

    this.interactionEvent$ = new Subject<InteractionEvent>()
    const eventPipe = merge<(InteractionEvent | undefined)[]>(
      fromEvent(window, 'mousedown').pipe(map(this.handleMouseEvent)),
      fromEvent(window, 'mousemove').pipe(map(this.handleMouseEvent)),
      fromEvent(window, 'mouseup').pipe(map(this.handleMouseEvent)),
      fromEvent(window, 'wheel').pipe(map(this.handleWheelEvent)),
      fromEvent(window, 'keydown').pipe(map(this.handleKeyEvent)),
      fromEvent(window, 'keyup').pipe(map(this.handleKeyEvent)),
    ).pipe(
      filter(Boolean),
    )

    eventPipe.subscribe(this.interactionEvent$)

    this.interactionEvent$
      .pipe(
        tap(this.setLastEvent),
        tap(this.updatePane),
      ).subscribe()
  }

  public get lastEvent(): InteractionEvent {
    if (!this._lastEvent) {
      this._lastEvent = new InteractionEvent()
    }
    return this._lastEvent
  }

  public set lastEvent(event: InteractionEvent) {
    this._lastEvent = event
  }

  private setLastEvent = (event: InteractionEvent) => {
    this.lastEvent = event
  }

  public updatePane = (event: InteractionEvent) => {
    const {
      modifiers,
      downKeys,
      downMouse,
      key,
      mouse,
    } = event
    this.paneState.modifier = `${[...modifiers].join(', ')}`

    this.paneState.mouse = [
      mouse ? `(${mouse.type.toLocaleLowerCase()}) ` : '',
      [...downMouse].map(code => MouseButton[code]).join(', '),
    ].join('')
    this.paneState.key = [
      key ? `(${key.type.toLocaleLowerCase()}) ` : '',
      [...downKeys].join(', '),
    ].join('')
    this.modifierBlade.refresh()
    this.mouseEventBlade.refresh()
    this.keyEventBlade.refresh()
  }

  public handleMouseEvent = (ev: MouseEvent): InteractionEvent | undefined => {
    const event = this.lastEvent.clone()
    const {
      x,
      y,
      metaKey,
      altKey,
      shiftKey,
      ctrlKey,
      button,
      type,
    } = ev
    event.shiftKey = shiftKey
    event.ctrlKey = ctrlKey
    event.altKey = altKey
    event.metaKey = metaKey

    if (!(button in MouseButton)) {
      return
    }

    let eventType: MouseTriggerType

    switch (type) {
      case 'mousedown': {
        if (event.downMouse.has(button)) {
          return
        }
        event.downMouse.add(button)
        eventType = MouseTriggerType.Down
        break
      }
      case 'mouseup': {
        event.downMouse.delete(button)
        eventType = MouseTriggerType.Up
        break
      }
      case 'mousemove': {
        eventType = MouseTriggerType.Move
        break
      }
      default: {
        return
      }
    }

    event.mouse = {
      x,
      y,
      type: eventType,
      trigger: button,
    }

    return event
  }

  public handleWheelEvent = (ev: WheelEvent): InteractionEvent => {
    const event = this.lastEvent.clone()
    const {
      deltaX,
      deltaY,
      metaKey,
      altKey,
      shiftKey,
      ctrlKey,
    } = ev

    event.shiftKey = shiftKey
    event.ctrlKey = ctrlKey
    event.altKey = altKey
    event.metaKey = metaKey
    event.mouse = {
      x: deltaX,
      y: deltaY,
      type: MouseTriggerType.Wheel,
      trigger: MouseButton.Middle,
    }

    return event
  }

  public handleKeyEvent = (ev: KeyboardEvent): InteractionEvent | undefined => {
    const event = this.lastEvent.clone()
    const {
      metaKey,
      altKey,
      shiftKey,
      ctrlKey,
      type,
      code,
    } = ev

    event.shiftKey = shiftKey
    event.ctrlKey = ctrlKey
    event.altKey = altKey
    event.metaKey = metaKey

    if (EventManager.modifierKeys.has(code)) {
      if (isSameSet(event.modifiers, this.lastEvent.modifiers)) {
        return
      } else {
        event.key = {
          type: type === 'keydown' ? KeyTriggerType.Down : KeyTriggerType.Up,
          trigger: code
        }
        return event
      }
    }

    let eventType: KeyTriggerType

    switch (type) {
      case 'keydown': {
        if (event.downKeys.has(code)) {
          return
        }
        event.downKeys.add(code)
        eventType = KeyTriggerType.Down
        break
      }
      case 'keyup': {
        event.downKeys.delete(code)
        eventType = KeyTriggerType.Up
        break
      }
      default: {
        return
      }
    }

    event.key = {
      type: eventType,
      trigger: code
    }

    return event
  }
}


const isSameSet = (setA: Set<any>, setB: Set<any>): boolean => {
  if (setA.size !== setB.size) {
    return false
  }
  for (const key of setA) {
    if (!setB.has(key)) {
      return false
    }
  }
  return true
}
