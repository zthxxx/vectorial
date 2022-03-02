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
import {
  add,
  sub,
  len,
  Vector,
} from 'vectorial'


type DOMMouseEvent = globalThis.MouseEvent

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

export interface EventKeyMatch {
  modifiers?: ModifierKey[];
  keys?: string[];
  mouse?: MouseButton[];
}

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

  /**
   * set if in dragging state, by mouse event
   *
   * ── down ── move ─ move - move ─── up ── move ─ move ──►
   *             │      │      │       │
   *           drag   drag    drag    drag
   *
   * ──── down ─── up ── move ─── down ── up ──►
   */
   public dragging?: {
    begin: Vector;
    offset: Vector;
    delta: Vector;
  }

  /**
   * for mouse event
   *
   * ── down ─── up ─ down ─ up ── down ── up ─────── down ── up ──►
   *                   │      │               > 400ms
   *                double  double
   *
   * ── down ─── up ── move ─── down ── up ──►
   */
  public isDoubleClick: boolean


  constructor() {
    this.modifiers = new Set()
    this.downKeys = new Set()
    this.downMouse = new Set()
    this.isDoubleClick = false
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
    event.isDoubleClick = this.isDoubleClick
    event.dragging = this.dragging
    return event
  }

  public match({ modifiers, keys, mouse }: EventKeyMatch): boolean {
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


export type MouseEvent = InteractionEvent & { mouse: NonNullable<InteractionEvent['mouse']> }
export type KeyEvent = InteractionEvent & { key: NonNullable<InteractionEvent['key']> }


export interface EventManagerProps {
  element: HTMLElement;
  pane: FolderApi;
}

export class EventManager extends Plugin {
  private _lastEvent?: InteractionEvent
  public interactionEvent$: Subject<InteractionEvent>
  private modifierBlade: MonitorBindingApi<string>
  private mouseEventBlade: MonitorBindingApi<string>
  private keyEventBlade: MonitorBindingApi<string>
  private dragBlade: MonitorBindingApi<string>
  private doubleClickBlade: MonitorBindingApi<string>
  private paneState: {
    modifier: string;
    mouse: string;
    key: string;
    drag: string;
    doubleClick: string;
  }

  /**
   * mouse drag begin position,
   * use for dead drag detection
   */
  private dragBase?: Vector

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

  constructor(parent: Viewport, { pane, element }: EventManagerProps) {
    super(parent)

    this.paneState = {
      modifier: '',
      mouse: '',
      key: '',
      drag: '',
      doubleClick: '',
    }

    const paneFolder = pane

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

    this.dragBlade = paneFolder.addMonitor(this.paneState, 'drag', {
      label: 'Dragging',
      interval: 0,
    })

    this.doubleClickBlade = paneFolder.addMonitor(this.paneState, 'doubleClick', {
      label: 'Double Click',
      interval: 0,
    })

    this.interactionEvent$ = new Subject<InteractionEvent>()
    const eventPipe = merge<(InteractionEvent | undefined)[]>(
      fromEvent(element, 'mousedown').pipe(map(this.handleMouseEvent)),
      fromEvent(window, 'mousemove').pipe(map(this.handleMouseEvent)),
      fromEvent(window, 'mouseup').pipe(map(this.handleMouseEvent)),
      fromEvent(element, 'wheel').pipe(map(this.handleWheelEvent)),
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
    this.paneState.drag = String(!!event.dragging)
    this.paneState.doubleClick = String(event.isDoubleClick)
    this.modifierBlade.refresh()
    this.mouseEventBlade.refresh()
    this.keyEventBlade.refresh()
    this.dragBlade.refresh()
    this.doubleClickBlade.refresh()
  }

  public handleMouseEvent = (ev: DOMMouseEvent): InteractionEvent | undefined => {
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
    const position: Vector = { x, y }

    event.shiftKey = shiftKey
    event.ctrlKey = ctrlKey
    event.altKey = altKey
    event.metaKey = metaKey

    /**
     * For `mousedown` or `mouseup` events, UIEvent.detail is 1 plus the current click count.
     * https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail
     */
    event.isDoubleClick = ev.detail > 1

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
        if (!this.dragBase) {
          this.dragBase = { ...position }
        }
        break
      }
      case 'mouseup': {
        event.downMouse.delete(button)
        eventType = MouseTriggerType.Up

        if (!event.downMouse.size) {
          event.dragging = undefined
          this.dragBase = undefined
        }
        break
      }
      case 'mousemove': {
        eventType = MouseTriggerType.Move

        if (!this.dragBase) {
          if (event.dragging) event.dragging = undefined
        } else if (
          !event.dragging
          && !isDeadDrag(this.dragBase, position)
        ) {
          event.dragging = {
            begin: { ...this.dragBase },
            offset: sub(position, this.dragBase),
            delta: sub(position, this.dragBase),
          }
        } else if (event.dragging) {
          event.dragging.delta = sub(position, this.lastEvent.mouse!)
          event.dragging.offset = sub(position, this.dragBase)
        }

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

export const isDeadDrag = (prev: Vector, next: Vector): boolean =>
  len(sub(prev, next)) < 8
