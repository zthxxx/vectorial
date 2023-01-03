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
  HandlerType,
  sub,
} from 'vectorial'
import {
  toSharedTypes,
} from '@vectorial/whiteboard/utils'
import {
  type MouseEvent,
  type KeyEvent,
  AnchorNode,
} from '@vectorial/whiteboard/scene'
import {
  createInteractGuard,
  normalizeMouseEvent,
} from '../utils'
import {
  type StateMouseEvent,
  type StateKeyEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
  CreatingDirection,
} from '../types'


export enum AdjustingEvent {
  Move = 'Move',
  Release = 'Release',
}

export enum AdjustingAction {
  Entry = 'Adjusting.Entry',
  Exit = 'Adjusting.Exit',
  Move = 'Adjusting.Move',
  Release = 'Adjusting.Release',
}

export type AdjustingActions = {
  [AdjustingAction.Entry]: EventObject;
  [AdjustingAction.Exit]: EventObject;
  [AdjustingAction.Move]: StateMouseEvent<AdjustingEvent.Move>;
  [AdjustingAction.Release]: StateMouseEvent<AdjustingEvent.Release>;
}

const adjustingInteract = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      machine,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<AdjustingActions> => {
        const { isMove, isDrag, isClickUp } = normalizeMouseEvent(event)

        if (isMove && isDrag) {
          return { type: AdjustingEvent.Move, event }
        }
        if (isClickUp) {
          return { type: AdjustingEvent.Release, event }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()

    interact$.pipe(
      filter(event => Boolean(event.key)),
      map((event: KeyEvent): StateKeyEvent => ({ type: AdjustingEvent.Move, event })),
      tap((event) => { machine?.send(event) }),
    ).subscribe()
  },
})

export const adjustingActions: StateActions<StateContext, AdjustingActions> = {
  [AdjustingAction.Entry]: adjustingInteract.entry,
  [AdjustingAction.Exit]: adjustingInteract.exit,

  [AdjustingAction.Move]: ({
    indicativeAnchor,
    indicativePath,
    vectorPath,
    creatingDirection,
    changes,
  }, { event }) => {
    const anchor = indicativeAnchor.vectorAnchor
    if (event.match({ modifiers: ['Alt'] })) {
      anchor.handlerType = HandlerType.Free
    } else {
      anchor.handlerType = HandlerType.Mirror
    }

    anchor.outHandler = sub(event.lastMouse!, anchor.position)

    changes.push([indicativeAnchor, { anchor: 'selected', inHandler: 'normal', outHandler: 'normal' }])

    indicativePath.path.anchors = match(creatingDirection)
      .with(CreatingDirection.Start, () => [anchor, vectorPath.anchors.at(0)])
      .with(CreatingDirection.End, () => [vectorPath.anchors.at(-1), anchor])
      .exhaustive()

    changes.push([indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }])
  },

  [AdjustingAction.Release]: (context) => {
    const {
      scene,
      vectorNode,
      vectorPath,
      anchorNodes,
      indicativeAnchor,
      indicativePath,
      creatingDirection,
      changes,
    } = context

    const vectorAnchor = indicativeAnchor.vectorAnchor.clone()
    const anchorNode = new AnchorNode({
      vectorAnchor,
      absoluteTransform: vectorNode.absoluteTransform,
      viewMatrix$: scene.events.viewMatrix$,
    })
    const anchors = vectorNode.binding.get('path')!.get('anchors')!

    match(creatingDirection)
      .with(CreatingDirection.Start, () => {
        vectorPath.addAnchorAt(vectorAnchor, 0)
        anchors.unshift([toSharedTypes(vectorAnchor.serialize())])
      })
      .with(CreatingDirection.End, () => {
        vectorPath.addAnchor(vectorAnchor)
        anchors.push([toSharedTypes(vectorAnchor.serialize())])
      })
      .exhaustive()

    anchorNodes.set(vectorAnchor, anchorNode)

    changes.push([anchorNode, { anchor: 'selected', inHandler: 'normal', outHandler: 'normal' }])

    changes.push([indicativeAnchor, undefined])
    changes.push([indicativePath, undefined])
    context.dragBase = undefined
  }
}
