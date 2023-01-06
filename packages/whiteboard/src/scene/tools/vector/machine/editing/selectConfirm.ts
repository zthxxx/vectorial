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
  PathHitType,
  HandlerType,
} from 'vectorial'
import {
  KeyTriggerType,
  type MouseEvent,
  type KeyEvent,
} from '@vectorial/whiteboard/scene'
import type {
  AnchorHitResult,
  HitResult,
} from '../../types'
import {
  normalizeMouseEvent,
  getResetStyleChanges,
  getSelectedStyleChanges,
  toggleAnchorHandler,
  createInteractGuard,
} from '../utils'
import {
  type StateMouseEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
  type GuardEvent,
  CreatingDirection,
} from '../types'


export enum SelectConfirmEvent {
  Adjust = 'Adjust',
  Unselect = 'Unselect',
  ResumeCreate = 'ResumeCreate',
  ToggleHandler = 'ToggleHandler',
  Cancel = 'Cancel',
}

export enum SelectConfirmAction {
  Entry = 'SelectConfirm.Entry',
  Exit = 'SelectConfirm.Exit',
  Adjust = 'SelectConfirm.Adjust',
  Unselect = 'SelectConfirm.Unselect',
  ResumeCreate = 'SelectConfirm.ResumeCreate',
  ToggleHandler = 'SelectConfirm.ToggleHandler',
}

export type SelectConfirmActions = {
  [SelectConfirmAction.Entry]: EventObject;
  [SelectConfirmAction.Exit]: EventObject;
  [SelectConfirmAction.Adjust]: StateMouseEvent<SelectConfirmEvent.Adjust>;
  [SelectConfirmAction.Unselect]: StateMouseEvent<SelectConfirmEvent.Unselect>;
  [SelectConfirmAction.ResumeCreate]: StateMouseEvent<SelectConfirmEvent.ResumeCreate>;
  [SelectConfirmAction.ToggleHandler]: StateMouseEvent<SelectConfirmEvent.ToggleHandler>;
}

const selectConfirmInteract = createInteractGuard<StateContext>({
  entry: (context, { interact$, hit }: StateMouseEvent & GuardEvent) => {
    const {
      scene,
      machine,
      vectorPath,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<SelectConfirmActions> => {
        const {
          isDrag,
          isClickUp,
          anchorHit,
        } = normalizeMouseEvent({
          event,
          vectorPath,
          viewportScale: scene.scale,
        })

        // dragBase will always be existed, code only for defense and type guard
        if (!context.dragBase) {
          return
        }

        if (isDrag) {
          return { type: SelectConfirmEvent.Adjust, event }

        } else if (isClickUp) {
          if (
            event.match({ modifiers: ['Meta'] })
            && [
              PathHitType.Anchor,
              PathHitType.InHandler,
              PathHitType.OutHandler,
            ].includes(hit?.type as PathHitType)
          ) {
            return { type: SelectConfirmEvent.ToggleHandler, event, hit }
          }

          if (
            !vectorPath.closed
            && !event.shiftKey
            && anchorHit?.type === PathHitType.Anchor
            && (
              anchorHit.point === vectorPath.anchors.at(0)
              || anchorHit.point === vectorPath.anchors.at(-1)
            )
          ) {
            return { type: SelectConfirmEvent.ResumeCreate, event, hit: anchorHit }
          }
          /**
           * if not hit anchor, that means anchor is new appended to selected;
           * if hit an anchor, that means the anchor need be judge to unselect;
           */
          if (hit?.type === PathHitType.Anchor) {
            return { type: SelectConfirmEvent.Unselect, event, hit }
          }

          return { type: SelectConfirmEvent.Cancel }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()

    interact$.pipe(
      filter(event => Boolean(event.key)),
      filter((event: KeyEvent) => (
        event.key.type === KeyTriggerType.Up
        && event.match({ keys: [] })
        && event.key.trigger === 'Escape'
      )),
      tap(() => { machine?.send({ type: SelectConfirmEvent.Cancel }) }),
    ).subscribe()
  },
})

export const selectConfirmActions: StateActions<StateContext, SelectConfirmActions> = {
  [SelectConfirmAction.Entry]: selectConfirmInteract.entry,
  [SelectConfirmAction.Exit]: selectConfirmInteract.exit,

  [SelectConfirmAction.Adjust]: (context, event) => {
    // actually, exec `AdjustingEditAction.Adjust`
  },

  [SelectConfirmAction.Unselect]: ({
    changes,
    anchorNodes,
    selected,
  }, { event, hit }) => {
    // hit will always be existed, code only for defense and type guard
    if (hit?.type !== PathHitType.Anchor) return

    const isMultiSelect = event.shiftKey

    const anchors: AnchorHitResult[] = isMultiSelect
      ? selected.filter(({ point }) => point !== hit.point)
      : [hit]

    selected.splice(0, selected.length, ...anchors)

    changes.push(...getResetStyleChanges(anchorNodes))
    changes.push(...getSelectedStyleChanges(selected, anchorNodes))
  },

  [SelectConfirmAction.ResumeCreate]: (context, { hit }) => {
    const {
      anchorNodes,
      selected,
      changes,
      vectorPath,
    } = context

    const first = vectorPath.anchors.at(0)!
    const last = vectorPath.anchors.at(0)!

    if (
      hit?.type !== PathHitType.Anchor
      || (
        hit?.point !== first
        && hit?.point !== last
      )
    ) return

    // when `resumeCreating`, the `hit.point` only can be `first` or `last`
    context.creatingDirection = hit.point === first
      ? CreatingDirection.Start
      : CreatingDirection.End

    selected.splice(0, selected.length, hit)
    changes.push(...getResetStyleChanges(anchorNodes))
    changes.push(...getSelectedStyleChanges(selected, anchorNodes))
  },

  [SelectConfirmAction.ToggleHandler]: ({
    scene,
    vectorPath,
    changes,
    anchorNodes,
    selected,
  }, { hit }: StateMouseEvent) => {
    scene.docTransact(() => {
      const hitResult = match(hit)
        .with({ type: PathHitType.Anchor }, (hit) => {
          const anchor = hit.point
          if (anchor.inHandler && anchor.outHandler) {
            anchor.inHandler = undefined
            anchor.outHandler = undefined
            anchor.handlerType = HandlerType.None
          } else (
            toggleAnchorHandler(hit)
          )
          selected.splice(0, selected.length, hit)
          return hit
        })

        .with({ type: PathHitType.InHandler }, (hit) => {
          hit.point.inHandler = undefined
          selected.splice(0, selected.length, {
            ...hit,
            type: PathHitType.Anchor,
          })
          return hit
        })

        .with({ type: PathHitType.OutHandler }, (hit) => {
          hit.point.outHandler = undefined
          selected.splice(0, selected.length, {
            ...hit,
            type: PathHitType.Anchor,
          })
          return hit
        })

        .otherwise(() => undefined)

      if (!hitResult) return

      hitResult.point.redraw?.()
      changes.push(...getResetStyleChanges(anchorNodes))
      changes.push(...getSelectedStyleChanges(selected, anchorNodes))
    })
  },
}
