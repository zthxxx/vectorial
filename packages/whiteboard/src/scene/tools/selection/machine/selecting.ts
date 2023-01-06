import {
  tap,
  map,
  filter,
} from 'rxjs/operators'
import {
  type EventObject,
} from 'xstate'
import {
  NodeType,
} from '@vectorial/whiteboard/model'
import {
  KeyTriggerType,
  type MouseEvent,
  type KeyEvent,
} from '@vectorial/whiteboard/scene'
import {
  createInteractGuard,
  normalizeMouseEvent,
} from './utils'
import {
  type StateMouseEvent,
  type StateKeyEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
  type ConditionPredicate,
} from './types'
import {
  MovingNodeEvent,
  MovingNodeAction,
  movingNodeActions
} from './moving'



export enum SelectingEvent {
  /** mouse move without select anything */
  Move = 'Move',
  Select = 'Select',
  Marquee = 'Marquee',
  EnterNode = 'EnterNode',
  Delete = 'Delete',
  Cancel = 'Cancel',
}


export enum SelectingAction {
  Entry = 'Selecting.Entry',
  Exit = 'Selecting.Exit',
  Move = 'Selecting.Move',
  Select = 'Selecting.Select',
  Marquee = 'Selecting.Marquee',
  Delete = 'Selecting.Delete',
  Cancel = 'Selecting.Cancel',
  Unselect = 'Selecting.Unselect',
}


export type SelectingActions = {
  [SelectingAction.Entry]: EventObject;
  [SelectingAction.Exit]: EventObject;
  [SelectingAction.Move]: StateMouseEvent<SelectingEvent.Move>;
  [SelectingAction.Select]: StateMouseEvent<SelectingEvent.Select>;
  [SelectingAction.Marquee]: StateMouseEvent<SelectingEvent.Marquee>;
  [SelectingAction.Delete]: StateKeyEvent<SelectingEvent.Delete>;
  [SelectingAction.Cancel]: StateKeyEvent<SelectingEvent.Cancel>;
}


export enum SelectConfirmingEvent {
  /** select and move => move node */
  Move = 'Move',
  Unselect = 'Unselect',
  Cancel = 'Cancel',
}

export enum SelectConfirmingAction {
  Entry = 'SelectConfirming.Entry',
  Exit = 'SelectConfirming.Exit',
  Move = 'SelectConfirming.Move',
  Unselect = 'SelectConfirming.Unselect',
  Cancel = 'SelectConfirming.Cancel',
}

export type SelectConfirmingActions = {
  [SelectConfirmingAction.Entry]: EventObject;
  [SelectConfirmingAction.Exit]: EventObject;
  [SelectConfirmingAction.Move]: StateMouseEvent<SelectConfirmingEvent.Move>;
  [SelectConfirmingAction.Unselect]: StateMouseEvent<SelectConfirmingEvent.Unselect>;
}



const selectingInteractGuard = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      scene,
      machine,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<SelectingActions> => {
        const {
          hit,
          isMove,
          isClickDown,
        } = normalizeMouseEvent(event, scene.page, scene.selected, scene.scale)

        if (isMove) {
          return { type: SelectingEvent.Move, event, hit }

        } else if (hit && isClickDown) {
          if (event.isDoubleClick) {
            return { type: SelectingEvent.EnterNode }
          }
          return { type: SelectingEvent.Select, event, hit }

        } else if (isClickDown) {
          return { type: SelectingEvent.Marquee, event }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()

    interact$.pipe(
      filter(event => event.key?.type === KeyTriggerType.Down),
      map((event: KeyEvent): StateEvents<SelectingActions> => {
        if (
          event.match({ modifiers: [], keys: ['Delete'] })
          || event.match({ modifiers: [], keys: ['Backspace'] })
        ) {
          return { type: SelectingEvent.Delete, event }

        } else if (event.match({ modifiers: [], keys: ['Escape'] })) {
          return { type: SelectingEvent.Cancel, event }

        } else if (event.match({ modifiers: [], keys: ['Enter'] })) {
          return { type: SelectingEvent.EnterNode }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()
  },
})


/**
 * selecting state events to actions
 */
export const selectingActions: StateActions<StateContext, SelectingActions> = {
  [SelectingAction.Entry]: selectingInteractGuard.entry,
  [SelectingAction.Exit]: selectingInteractGuard.exit,

  [SelectingAction.Move]: (context, { hit }) => {
    const {
      scene,
      selectCache,
    } = context
    const { selected } = scene
    const node = hit
    if (!node) {
      scene.hovered = undefined
      if (selectCache.size) {
        selectCache.clear()
      }
      return
    }
    if (selected.has(node)) {
      selectCache.clear()
    }
    selectCache.add(node)
    scene.hovered = node
  },

  [SelectingAction.Select]: (context, { event, hit }) => {
    const {
      scene,
      selectCache,
      setSelected,
    } = context
    const selected = new Set(scene.selected)
    const isMultiSelect = event.shiftKey
    selectCache.clear()
    scene.hovered = undefined

    if (!hit) {
      if (!isMultiSelect) {
        selected.clear()
        setSelected(selected)
      }
      return
    }

    if (selected.has(hit)) {
      // leave selectCache to `SelectConfirming` cache for mark them as need unselect
      selectCache.add(hit)
      return
    }
    if (!isMultiSelect) {
      selected.clear()
    }

    selected.add(hit)
    setSelected(selected)
  },

  [SelectingAction.Marquee]: (context, event) => {
    selectingActions[SelectingAction.Select](context, {
      ...event,
      type: SelectingEvent.Select
    })
  },

  [SelectingAction.Cancel]: (context) => {
    const {
      selectCache,
      setSelected,
    } = context

    selectCache.clear()
    setSelected(new Set())
  },

  [SelectingAction.Delete]: (context) => {
    const {
      scene,
      setSelected,
    } = context

    const { page, selected } = scene

    setSelected(new Set())
    scene.docTransact(() => {
      selected.forEach(node => page.delete(node.id))
    })
  },
}

const selectConfirmingInteractGuard = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      scene,
      machine,
      selectCache,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<SelectConfirmingActions> => {
        const {
          hit,
          isDrag,
          isClickUp,
        } = normalizeMouseEvent(event, scene.page, scene.selected, scene.scale)

        if (isDrag) {
          return { type: SelectConfirmingEvent.Move, event, hit }
        } else if (isClickUp) {
          // selectCache set selectingSelect in to mark them as need unselect
          if (selectCache.size) {
            return { type: SelectConfirmingEvent.Unselect, event, hit }
          }
          return { type: SelectConfirmingEvent.Cancel }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()
  },
})

/**
 * selectConfirming state events to actions
 */
export const selectConfirmingActions: StateActions<StateContext, SelectConfirmingActions> = {
  [SelectConfirmingAction.Entry]: selectConfirmingInteractGuard.entry,
  [SelectConfirmingAction.Exit]: selectConfirmingInteractGuard.exit,

  [SelectConfirmingAction.Move]: (context, event) => {
    movingNodeActions[MovingNodeAction.Move](context, {
      ...event,
      type: MovingNodeEvent.Move,
    })
  },

  [SelectConfirmingAction.Unselect]: (context, { event, hit }) => {
    const {
      scene,
      selectCache,
      setSelected,
    } = context
    if (!hit || !selectCache) return
    selectCache.clear()
    const selected = new Set(scene.selected)

    const isMultiSelect = event.shiftKey
    if (isMultiSelect) {
      selected.delete(hit)
    } else {
      selected.clear()
      selected.add(hit)
    }

    setSelected(selected)
  },
}

export enum SelectingCondition {
  CanEditVector = 'CanEditVector',
}

export const selectingConditions: Record<SelectingCondition, ConditionPredicate<StateContext>> = {
  [SelectingCondition.CanEditVector]: ({ scene }) => (
    scene.selected.size === 1
    && [...scene.selected][0].type === NodeType.Vector
  ),
}
