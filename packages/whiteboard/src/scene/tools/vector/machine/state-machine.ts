import {
  type MachineConfig,
  type EventObject,
  createMachine,
} from 'xstate'
import {
  type StateContext,
  type ConditionPredicate,
  VectorRoot,
  machineName,
} from './types'
import {
  Creating,
  CreatingAction,
  creatingActions,

  IndicatingEvent,
  IndicatingAction,
  indicatingActions,

  AdjustingEvent,
  AdjustingAction,
  adjustingActions,

  CreateDoneConfirmEvent,
  CreateDoneConfirmAction,
  createDoneConfirmActions,
} from './creating'
import {
  Editing,
  EditingAction,
  editingActions,

  SelectingEvent,
  SelectingAction,
  selectingActions,

  SelectConfirmEvent,
  SelectConfirmAction,
  selectConfirmActions,

  AdjustingEditEvent,
  AdjustingEditAction,
  adjustingEditActions,

  MarqueeingEvent,
  MarqueeingAction,
  marqueeingActions,
} from './editing'


enum InitialTransition {
  ToCreating = 'Initial.ToCreating',
  ToEditing = 'Initial.ToEditing',
}

// https://stately.ai/viz/3a54fa38-e3c5-469e-b30f-4b16732d9bb8
export const machineConfig = {
  id: machineName,
  initial: VectorRoot.Initial,
  states: {
    [VectorRoot.Initial]: {
      always: [
        {
          target: VectorRoot.Creating,
          cond: InitialTransition.ToCreating,
        },
        {
          target: VectorRoot.Editing,
          cond: InitialTransition.ToEditing,
        },
      ],
    },

    [VectorRoot.Creating]: {
      initial: Creating.Indicating,
      entry: CreatingAction.Entry,
      exit: CreatingAction.Exit,
      states: {
        [Creating.Indicating]: {
          entry: IndicatingAction.Entry,
          exit: IndicatingAction.Exit,
          on: {
            [IndicatingEvent.Move]: {
              actions: IndicatingAction.Move,
            },
            [IndicatingEvent.Hover]: {
              actions: IndicatingAction.Hover,
            },
            [IndicatingEvent.ClosingHover]: {
              actions: IndicatingAction.ClosingHover,
            },
            [IndicatingEvent.CreateAnchor]: {
              target: Creating.AdjustConfirm,
              actions: IndicatingAction.CreateAnchor,
            },
            [IndicatingEvent.ClosePath]: {
              target: Creating.Done,
              actions: [
                IndicatingAction.ClosePath,
                CreateDoneConfirmAction.CreateDone,
              ],
            },
            [IndicatingEvent.Select]: {
              target: `#${machineName}.${VectorRoot.Editing}.${Editing.SelectConfirm}`,
              actions: SelectingAction.Select,
            },
            [IndicatingEvent.InsertAnchor]: {
              target: `#${machineName}.${VectorRoot.Editing}.${Editing.SelectConfirm}`,
              actions: SelectingAction.InsertAnchor,
            },
            [IndicatingEvent.Cancel]: Creating.Done,
          },
        },

        [Creating.AdjustConfirm]: {
          entry: AdjustingAction.Entry,
          exit: AdjustingAction.Exit,
          on: {
            [AdjustingEvent.Move]: {
              target: Creating.Adjusting,
              actions: AdjustingAction.Move,
            },
            [AdjustingEvent.Release]: {
              target: Creating.CreateDoneConfirm,
              actions: AdjustingAction.Release,
            },
          },
        },

        [Creating.Adjusting]: {
          entry: AdjustingAction.Entry,
          exit: AdjustingAction.Exit,
          on: {
            [AdjustingEvent.Move]: {
              actions: AdjustingAction.Move,
            },
            [AdjustingEvent.Release]: {
              target: Creating.Indicating,
              actions: AdjustingAction.Release,
            },
          },
        },

        [Creating.CreateDoneConfirm]: {
          entry: CreateDoneConfirmAction.Entry,
          exit: CreateDoneConfirmAction.Exit,
          after: {
            300: Creating.Indicating,
          },
          on: {
            [CreateDoneConfirmEvent.Move]: Creating.Indicating,
            [CreateDoneConfirmEvent.CreateDone]: {
              target: `#${machineName}.${VectorRoot.Done}`,
              actions: CreateDoneConfirmAction.CreateDone,
            },
          }
        },

        [Creating.Done]: {
          type: 'final',
        },
      },
      onDone: VectorRoot.Editing,
    },

    [VectorRoot.Editing]: {
      initial: Editing.Selecting,
      entry: EditingAction.Entry,
      states: {
        [Editing.Selecting]: {
          entry: SelectingAction.Entry,
          exit: SelectingAction.Exit,
          on: {
            [SelectingEvent.Move]: {
              actions: IndicatingAction.Hover,
            },
            [SelectingEvent.Select]: {
              target: Editing.SelectConfirm,
              actions: SelectingAction.Select,
            },
            [SelectingEvent.InsertAnchor]: {
              target: Editing.SelectConfirm,
              actions: SelectingAction.InsertAnchor,
            },
            [SelectingEvent.Marquee]: {
              target: Editing.Marqueeing,
              actions: SelectingAction.Marquee,
            },
            [SelectingEvent.Cancel]: Editing.Done,
          },
        },

        [Editing.SelectConfirm]: {
          entry: SelectConfirmAction.Entry,
          exit: SelectConfirmAction.Exit,
          on: {
            [SelectConfirmEvent.Adjust]: {
              target: Editing.Adjusting,
              actions: AdjustingEditAction.Adjust,
            },
            [SelectConfirmEvent.Unselect]: {
              target: Editing.Selecting,
              actions: SelectConfirmAction.Unselect,
            },
            [SelectConfirmEvent.ResumeCreate]: {
              target: `#${machineName}.${VectorRoot.Creating}.${Creating.Indicating}`,
              actions: SelectConfirmAction.ResumeCreate,
            },
            [SelectConfirmEvent.ToggleHandler]: {
              target: Editing.Selecting,
              actions: SelectConfirmAction.ToggleHandler,
            },
            [SelectConfirmEvent.Cancel]: Editing.Selecting,
          },
        },

        [Editing.Adjusting]: {
          entry: AdjustingEditAction.Entry,
          exit: AdjustingEditAction.Exit,
          on: {
            [AdjustingEditEvent.Adjust]: {
              actions: AdjustingEditAction.Adjust,
            },
            [AdjustingEditEvent.Done]: Editing.Selecting,
          },
        },

        [Editing.Marqueeing]: {
          entry: MarqueeingAction.Entry,
          exit: MarqueeingAction.Exit,
          on: {
            [MarqueeingEvent.Marquee]: {
              actions: MarqueeingAction.Marquee,
            },
            [MarqueeingEvent.Done]: Editing.EditDoneConfirm,
          },
        },

        [Editing.EditDoneConfirm]: {
          entry: CreateDoneConfirmAction.Entry,
          exit: CreateDoneConfirmAction.Exit,
          after: {
            300: Editing.Selecting,
          },
          on: {
            [CreateDoneConfirmEvent.Move]: Editing.Selecting,
            [CreateDoneConfirmEvent.CreateDone]: {
              target: `#${machineName}.${VectorRoot.Done}`,
              actions: CreateDoneConfirmAction.CreateDone,
            },
          },
        },

        [Editing.Done]: {
          type: 'final',
        },
      },
      onDone: VectorRoot.Done,
    },

    [VectorRoot.Done]: {
      type: 'final',
    },
  }
} satisfies MachineConfig<StateContext, any, EventObject>


const initialTransition: Record<InitialTransition, ConditionPredicate<StateContext>> = {
  [InitialTransition.ToCreating]: ({ vectorPath }) => !vectorPath.anchors.length,
  [InitialTransition.ToEditing]: ({ vectorPath }) => vectorPath.anchors.length > 0,
}

export const createVectorToolMachine = (context: StateContext) =>
  createMachine(
    {
      ...machineConfig,
      context,
    },
    {
      actions: {
        ...creatingActions,
        ...indicatingActions,
        ...adjustingActions,
        ...createDoneConfirmActions,
        ...editingActions,
        ...selectingActions,
        ...selectConfirmActions,
        ...adjustingEditActions,
        ...marqueeingActions,
      },
      guards: initialTransition,
    },
  )

