import {
  createMachine,
} from 'xstate'
import {
  NodeType,
} from '@vectorial/whiteboard/model'
import type {
  StateEvent,
  StateContext,
  SelectToolMachine,
} from './types'
import {
  createEventGuard,
} from './utils'
import {
  enterSelecting,
  selectingMove,
  selectingSelect,
  selectingCancel,
  enterSelectConfirming,
  confirmingUnselect,
  selectingDelete,
} from './selection'
import {
  enterMarqueeing,
  exitMarqueeing,
  marqueeAction,
} from './marquee'
import {
  enterMovingNode,
  movingNodeAction,
} from './move'


export const createSelectToolMachine = (context: StateContext): SelectToolMachine =>
  createMachine<StateContext, StateEvent>({
    id: 'select-tool',
    initial: 'selecting',
    context,
    states: {
      selecting: {
        ...createEventGuard(enterSelecting),
        on: {
          move: {
            actions: selectingMove,
          },
          select: {
            target: 'selectConfirming',
            actions: selectingSelect,
          },
          marquee: {
            target: 'marqueeing',
            actions: selectingSelect,
          },
          enterNode: {
            target: 'editVector',
            cond: ({ scene }) => (
              scene.selected.size === 1
              && [...scene.selected][0].type === NodeType.Vector
            ),
          },
          delete: {
            actions: selectingDelete,
          },
          cancel: {
            actions: selectingCancel,
          },
        },
      },
      selectConfirming: {
        ...createEventGuard(enterSelectConfirming),
        on: {
          moveNode: {
            target: 'movingNode',
            actions: movingNodeAction,
          },
          unselect: {
            target: 'selecting',
            actions: confirmingUnselect,
          },
          cancel: {
            target: 'selecting',
          },
        }
      },
      movingNode: {
        ...createEventGuard(enterMovingNode),
        on: {
          move: {
            actions: movingNodeAction,
          },
          done: {
            target: 'selecting',
          },
        },
      },
      marqueeing: {
        ...createEventGuard(
          enterMarqueeing,
          exitMarqueeing,
        ),
        on: {
          marquee: {
            actions: marqueeAction,
          },
          marqueeDone: {
            target: 'selecting',
          },
        },
      },
      editVector: {
        type: 'final',
      },
    },
  })


