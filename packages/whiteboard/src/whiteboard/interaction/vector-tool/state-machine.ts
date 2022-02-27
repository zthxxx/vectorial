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
  enterTwoStepsConfirm,
  createDone,
} from './creating'
import {
  enterEditing,
  enterSelecting,
  selectingSelect,
  selectingUnselect,
  enterDeadZoneChecking,
  enterAdjusting,
  adjustingAdjust,
  enterMarqueeing,
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
              // select: 'selecting.selected',
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
                target: 'twoStepsConfirm',
                actions: adjustingRelease,
              }
            }
          },
          twoStepsConfirm: {
            entry: enterTwoStepsConfirm,
            exit: unsubscribeAll,
            after: {
              400: 'indicating',
            },
            on: {
              move: 'indicating',
              confirm: {
                target: 'done',
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
          }
        },
        onDone: 'editing',
      },
      editing: {
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
                target: 'deadZoneChecking',
                actions: selectingSelect,
              },
              marquee: {
                target: 'marqueeing',
                actions: selectingSelect,
              }
            },
          },
          deadZoneChecking: {
            entry: enterDeadZoneChecking,
            exit: unsubscribeAll,
            on: {
              adjust: {
                target: 'adjusting',
                actions: adjustingAdjust,
              },
              unselect: {
                target: 'selecting',
                actions: selectingUnselect,
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
                target: 'selecting',
              },
            },
          },
        },
        on: {
          creating: 'creating',
          done: 'done',
        }
      },
      done: {
        type: 'final',
      },
    },
  })
