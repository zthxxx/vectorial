import {
  Subject,
  fromEvent,
  merge,
  Observable,
  of,
  from,
} from 'rxjs'
import {
  tap,
  map,
  filter,
  mergeMap,
} from 'rxjs/operators'
import {
  sub,
  len,
  Vector,
  applyInverse,
} from 'vectorial'
import type {
  Scene,
} from './scene'


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
  /**
   * keyboard pressed keys without modifiers
   * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
   */
  keys?: string[];
  mouse?: MouseButton[];
}

export class InteractEvent {
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

  /**
   * last mouse position
   * useful when trigger key event or wheel
   */
  public lastMouse?: Vector

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

  public clone(): InteractEvent {
    const event = new InteractEvent()
    event.modifiers = new Set(this.modifiers)
    event.downKeys = new Set(this.downKeys)
    event.downMouse = new Set(this.downMouse)
    if (this.lastMouse) {
      event.lastMouse = { ...this.lastMouse }
    }
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


export type MouseEvent = InteractEvent & { mouse: NonNullable<InteractEvent['mouse']> }
export type KeyEvent = InteractEvent & { key: NonNullable<InteractEvent['key']> }


export interface EventManagerProps {
  element: HTMLElement;
  scene: Scene;
}

export class EventManager {
  private _lastEvent?: InteractEvent
  /**
   * all mouse position relative inside scene
   */
  public scene: Scene;
  public interactEvent$: Subject<InteractEvent>

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

  constructor({ element, scene }: EventManagerProps) {
    this.scene = scene
    this.interactEvent$ = new Subject<InteractEvent>()

    const eventPipe = merge<(InteractEvent | undefined)[]>(
      merge(
        fromEvent(element, 'mousedown'),
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'mouseup'),
      ).pipe(
        tap(this.preventDefaultAndPropagation),
        map(this.handleMouseEvent),
      ),
      merge(
        fromEvent(window, 'keydown'),
        fromEvent(window, 'keyup'),
      ).pipe(
        tap(this.preventDefaultAndPropagation),
        mergeMap(this.handleKeyEvent),
      ),
      fromEvent(window, 'blur').pipe(mergeMap(this.handleBlurEvent)),
      fromEvent(element, 'wheel').pipe(
        tap(this.preventDefaultAndPropagation),
        map(this.handleWheelEvent)
      ),
    ).pipe(
      filter(Boolean),
    )

    eventPipe.subscribe(this.interactEvent$)

    this.interactEvent$
      .pipe(
        tap(this.setLastEvent),
      ).subscribe()
  }

  public get lastEvent(): InteractEvent {
    if (!this._lastEvent) {
      this._lastEvent = new InteractEvent()
    }
    return this._lastEvent
  }

  public set lastEvent(event: InteractEvent) {
    this._lastEvent = event
  }

  private setLastEvent = (event: InteractEvent) => {
    this.lastEvent = event
  }

  public preventDefaultAndPropagation = (e: DOMMouseEvent | KeyboardEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  public handleMouseEvent = (ev: DOMMouseEvent): InteractEvent | undefined => {
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
    const position: Vector = applyInverse({ x, y }, this.scene.viewMatrix)

    event.lastMouse = position
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
      ...position,
      type: eventType,
      trigger: button,
    }

    return event
  }

  public handleWheelEvent = (ev: WheelEvent): InteractEvent => {
    const event = this.lastEvent.clone()
    const { scene } = this
    const {
      x,
      y,
      deltaX,
      deltaY,
      metaKey,
      altKey,
      shiftKey,
      ctrlKey,
    } = ev

    event.lastMouse = applyInverse({ x, y }, scene.viewMatrix)
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

  public handleKeyEvent = (ev: KeyboardEvent): Observable<InteractEvent | undefined> => {
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
        return of()
      } else if (type === 'keyup' && ['MetaLeft', 'MetaRight'].includes(code)) {
        // https://stackoverflow.com/questions/11818637/why-does-javascript-drop-keyup-events-when-the-metakey-is-pressed-on-mac-browser/57153300#57153300
        let lastKeyup = event.clone()
        lastKeyup.key = {
          type: KeyTriggerType.Up,
          trigger: code
        }
        // simulation release keys before MetaKey up
        const releaseKeys = [...event.downKeys].map(code => {
          lastKeyup.downKeys.delete(code)
          const keyup = lastKeyup.clone()
          keyup.metaKey = true
          keyup.key = {
            type: KeyTriggerType.Up,
            trigger: code
          }
          return keyup
        })
        return from([... releaseKeys, lastKeyup])

      } else {
        event.key = {
          type: type === 'keydown' ? KeyTriggerType.Down : KeyTriggerType.Up,
          trigger: code
        }
        return of(event)
      }
    }

    let eventType: KeyTriggerType

    switch (type) {
      case 'keydown': {
        if (event.downKeys.has(code)) {
          return of()
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
        return of()
      }
    }

    event.key = {
      type: eventType,
      trigger: code
    }

    return of(event)
  }

  public handleBlurEvent = (): Observable<InteractEvent | undefined> => {
    const releaseKeys: InteractEvent[] = []
    const event = this.lastEvent.clone()

    event.isDoubleClick = false
    event.dragging = undefined
    this.dragBase = undefined

    if (event.downMouse.size) {
      event.downMouse.forEach(button => {
        event.downMouse.delete(button)
        const keyup = event.clone()
        keyup.mouse = {
          x: 0,
          y: 0,
          type: MouseTriggerType.Up,
          trigger: button,
        }
        releaseKeys.push(keyup)
      })
    }

    if (event.downKeys.size) {
      event.downKeys.forEach(code => {
        event.downKeys.delete(code)
        const keyup = event.clone()
        keyup.key = {
          type: KeyTriggerType.Up,
          trigger: code
        }
        releaseKeys.push(keyup)
      })
    }


    if (event.modifiers.size) {
      event.modifiers.forEach(key => {
        event.modifiers.delete(key)
        const keyup = event.clone()
        keyup.key = {
          type: KeyTriggerType.Up,
          trigger: key
        }
        releaseKeys.push(keyup)
      })
    }

    return from(releaseKeys)
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
