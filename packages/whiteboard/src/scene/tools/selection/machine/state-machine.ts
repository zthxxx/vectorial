import {
  type MachineConfig,
  type EventObject,
  createMachine,
} from 'xstate'
import {
  type StateContext,
  Selection,
} from './types'
import {
  SelectingEvent,
  SelectingAction,
  selectingActions,
  SelectConfirmingEvent,
  SelectConfirmingAction,
  selectConfirmingActions,
  SelectingCondition,
  selectingConditions,
} from './selecting'
import {
  MovingNodeEvent,
  MovingNodeAction,
  movingNodeActions,
} from './moving'
import {
  MarqueeingEvent,
  MarqueeingAction,
  marqueeingActions,
} from './marquee'


// https://stately.ai/viz/57a88792-3e03-4706-a32d-5be0ad9349e2
export const machineConfig = {
  id: 'select-tool',
  initial: Selection.Selecting,
  states: {
    [Selection.Selecting]: {
      entry: SelectingAction.Entry,
      exit: SelectingAction.Exit,
      on: {
        [SelectingEvent.Move]: {
          actions: SelectingAction.Move,
        },
        [SelectingEvent.Select]: {
          target: Selection.SelectConfirming,
          actions: SelectingAction.Select,
        },
        [SelectingEvent.Marquee]: {
          target: Selection.Marqueeing,
          actions: SelectingAction.Marquee,
        },
        [SelectingEvent.EnterNode]: {
          target: Selection.EditVector,
          cond: SelectingCondition.CanEditVector,
        },
        [SelectingEvent.Delete]: {
          actions: SelectingAction.Delete,
        },
        [SelectingEvent.Cancel]: {
          actions: SelectingAction.Cancel,
        },
      },
    },

    [Selection.SelectConfirming]: {
      entry: SelectConfirmingAction.Entry,
      exit: SelectConfirmingAction.Exit,
      on: {
        [SelectConfirmingEvent.Move]: {
          target: Selection.MovingNode,
          actions: SelectConfirmingAction.Move,
        },
        [SelectConfirmingEvent.Unselect]: {
          target: Selection.Selecting,
          actions: SelectConfirmingAction.Unselect,
        },
        [SelectConfirmingEvent.Cancel]: {
          target: Selection.Selecting,
        },
      },
    },

    [Selection.MovingNode]: {
      entry: MovingNodeAction.Entry,
      exit: MovingNodeAction.Exit,
      on: {
        [MovingNodeEvent.Move]: {
          actions: MovingNodeAction.Move,
        },
        [MovingNodeEvent.Done]: {
          target: Selection.Selecting,
        },
      },
    },

    [Selection.Marqueeing]: {
      entry: MarqueeingAction.Entry,
      exit: MarqueeingAction.Exit,
      on: {
        [MarqueeingEvent.Marquee]: {
          actions: MarqueeingAction.Marquee,
        },
        [MovingNodeEvent.Done]: {
          target: Selection.Selecting,
        },
      },
    },

    [Selection.EditVector]: {
      type: 'final',
    },
  },
} satisfies MachineConfig<StateContext, any, EventObject>

export const createSelectToolMachine = (context: StateContext) =>
  createMachine(
    {
      ...machineConfig,
      context,
    },
    {
      actions: {
        ...selectingActions,
        ...selectConfirmingActions,
        ...movingNodeActions,
        ...marqueeingActions,
      },
      guards: selectingConditions,
    },
  )
