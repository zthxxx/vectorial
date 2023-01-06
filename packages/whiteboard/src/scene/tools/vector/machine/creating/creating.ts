import {
  tap,
  map,
  filter,
} from 'rxjs/operators'
import {
  type EventObject,
} from 'xstate'
import { match } from 'ts-pattern'
import {
  cursor,
} from '@vectorial/whiteboard/assets'
import {
  type MouseEvent,
  type AnchorNode,
} from '@vectorial/whiteboard/scene'
import {
  createInteractGuard,
  normalizeMouseEvent,
} from '../utils'
import {
  type StateContext,
  type StateActions,
  type StateEvents,
  CreatingDirection,
} from '../types'


export enum CreatingAction {
  Entry = 'Creating.Entry',
  Exit = 'Creating.Exit',
}

const creatingInteractGuard = createInteractGuard<StateContext>({
  entry: (context) => {
    const {
      scene,
      indicativeAnchor,
      indicativePath,
      changes,
    } = context

    scene.setCursor({ icon: cursor.pen })
    changes.push([indicativeAnchor, { anchor: 'normal', inHandler: undefined, outHandler: undefined }])
    changes.push([indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }])
  },

  exit: ({ scene }) => scene.setCursor({ icon: cursor.arrow }),
})

export const creatingActions = {
  [CreatingAction.Entry]: creatingInteractGuard.entry,
  [CreatingAction.Exit]: creatingInteractGuard.exit,
}

export enum CreateDoneConfirmEvent {
  Move = 'Move',
  CreateDone = 'CreateDone',
}

export enum CreateDoneConfirmAction {
  Entry = 'CreateDoneConfirm.Entry',
  Exit = 'CreateDoneConfirm.Exit',
  CreateDone = 'CreateDoneConfirm.Confirm',
}

export type CreateDoneConfirmActions = {
  [CreateDoneConfirmAction.Entry]: EventObject,
  [CreateDoneConfirmAction.Exit]: EventObject,
  [CreateDoneConfirmAction.CreateDone]: EventObject,
}

const createDoneConfirmInteract = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      scene,
      vectorPath,
      machine,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<CreateDoneConfirmActions> => {
        const { anchorHit, isMove, isClickDown } = normalizeMouseEvent({
          event,
          vectorPath,
          viewportScale: scene.scale,
        })

        if (isClickDown && event.isDoubleClick) {
          return { type: CreateDoneConfirmEvent.CreateDone }
        }

        if (isMove && !anchorHit) {
          return { type: CreateDoneConfirmEvent.Move }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()
  },
})

export const createDoneConfirmActions: StateActions<StateContext, CreateDoneConfirmActions> = {
  [CreateDoneConfirmAction.Entry]: createDoneConfirmInteract.entry,
  [CreateDoneConfirmAction.Exit]: createDoneConfirmInteract.exit,

  [CreateDoneConfirmAction.CreateDone]: (context) => {
    const {
      indicativeAnchor,
      indicativePath,
      vectorPath,
      anchorNodes,
      creatingDirection,
      changes,
    } = context
    const { anchors } = vectorPath

    const style: AnchorNode['style'] = {
      anchor: 'normal',
      inHandler: undefined,
      outHandler: undefined
    }

    match(creatingDirection)
      .with(CreatingDirection.Start, () => {
        changes.push(
          [anchorNodes.get(anchors.at(0)!), style],
          [anchorNodes.get(anchors.at(1)!), style],
        )
      })
      .with(CreatingDirection.End, () => {
        changes.push(
          [anchorNodes.get(anchors.at(-1)!), style],
          [anchorNodes.get(anchors.at(-2)!), style],
        )
      })
      .exhaustive()

    changes.push([indicativeAnchor, undefined])
    changes.push([indicativePath, undefined])

    context.creatingDirection = CreatingDirection.End
  },
}
