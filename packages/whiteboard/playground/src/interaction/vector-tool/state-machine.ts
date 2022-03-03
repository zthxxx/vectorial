import {
  createMachine,
} from 'xstate'
import type {
  StateEvent,
  StateContext,
  VectorToolMachine,
} from './types'
import {
  unsubscribeAll,
} from './utils'
import {
  enterCreating,
  exitCreating,
  enterIndicating,
  indicatingMove,
  hoverIndicate,
  indicatingClosingHover,
  indicatingCreate,
  indicatingClosePath,
  enterAdjustOrCondition,
  adjustingMove,
  adjustingRelease,
  enterDoubleClickConfirming,
  createDone,
} from './creating'
import {
  enterEditing,
  enterSelecting,
  selectingSelect,
  selectingResumeCreating,
  enterSelectConfirming,
  confirmingUnselect,
  confirmingToggleHander,
  enterAdjusting,
  adjustingAdjust,
  enterMarqueeing,
  selectingInsertAnchor,
} from './editing'


export const createVectorToolMachine = (context: StateContext): VectorToolMachine =>
  createMachine<StateContext, StateEvent>({
    id: 'vector-tool',
    initial: 'initial',
    context,
    states: {
      initial: {
        always: [
          {
            target: 'creating',
            cond: ({ vectorPath }) => !vectorPath.anchors.length,
          },
          {
            target: 'editing',
            cond: ({ vectorPath }) => vectorPath.anchors.length > 0,
          },
        ],
      },
      creating: {
        id: 'creating',
        initial: 'indicating',
        entry: enterCreating,
        exit: exitCreating,
        states: {
          indicating: {
            entry: enterIndicating,
            exit: unsubscribeAll,
            on: {
              move: {
                actions: indicatingMove,
              },
              hover: {
                actions: hoverIndicate,
              },
              closingHover: {
                actions: indicatingClosingHover,
              },
              create: {
                target: 'condition',
                actions: indicatingCreate,
              },
              closePath: {
                target: 'done',
                actions: indicatingClosePath,
              },
              select: {
                target: '#editing.selectConfirming',
                actions: selectingSelect,
              },
              insertAnchor: {
                target: '#editing.selectConfirming',
                actions: selectingInsertAnchor
              },
              cancel: {
                target: 'done',
              },
            },
          },
          condition: {
            entry: enterAdjustOrCondition,
            exit: unsubscribeAll,
            on: {
              move: {
                target: 'adjusting',
                actions: adjustingMove,
              },
              release: {
                target: 'doubleClickConfirming',
                actions: adjustingRelease,
              }
            }
          },
          doubleClickConfirming: {
            entry: enterDoubleClickConfirming,
            exit: unsubscribeAll,
            after: {
              400: 'indicating',
            },
            on: {
              move: 'indicating',
              confirm: {
                target: '#vector-tool.done',
                actions: createDone,
              },
            }
          },
          adjusting: {
            entry: enterAdjustOrCondition,
            exit: unsubscribeAll,
            on: {
              move: {
                actions: adjustingMove,
              },
              release: {
                target: 'indicating',
                actions: adjustingRelease,
              },
            }
          },
          done: {
            type: 'final',
          },
        },
        onDone: 'editing',
      },
      editing: {
        id: 'editing',
        entry: enterEditing,
        initial: 'selecting',
        states: {
          selecting: {
            entry: enterSelecting,
            exit: unsubscribeAll,
            on: {
              move: {
                actions: hoverIndicate,
              },
              select: {
                target: 'selectConfirming',
                actions: selectingSelect,
              },
              insertAnchor: {
                target: 'selectConfirming',
                actions: selectingInsertAnchor
              },
              marquee: {
                target: 'marqueeing',
                actions: selectingSelect,
              },
              cancel: {
                target: 'done',
              },
            },
          },
          selectConfirming: {
            entry: enterSelectConfirming,
            exit: unsubscribeAll,
            on: {
              adjust: {
                target: 'adjusting',
                actions: adjustingAdjust,
              },
              unselect: {
                target: 'selecting',
                actions: confirmingUnselect,
              },
              resumeCreating: {
                target: '#creating.indicating',
                actions: selectingResumeCreating,
              },
              toggleHandler: {
                target: 'selecting',
                actions: confirmingToggleHander,
              },
              cancel: {
                target: 'selecting',
              }
            },
          },
          adjusting: {
            entry: enterAdjusting,
            exit: unsubscribeAll,
            on: {
              adjust: {
                actions: adjustingAdjust,
              },
              done: {
                target: 'selecting',
              }
            },
          },
          marqueeing: {
            entry: enterMarqueeing,
            exit: unsubscribeAll,
            on: {
              marquee: {

              },
              marqueeDone: {
                target: 'doubleClickConfirming',
              },
            },
          },
          doubleClickConfirming: {
            entry: enterDoubleClickConfirming,
            exit: unsubscribeAll,
            after: {
              400: 'selecting',
            },
            on: {
              move: 'selecting',
              confirm: {
                target: 'done',
                actions: createDone,
              },
            },
          },
          done: {
            type: 'final',
          },
        },
        onDone: 'done',
      },
      done: {
        type: 'final',
      },
    },
  })
