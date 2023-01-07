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
  math,
} from 'vectorial'
import {
  KeyTriggerType,
  type MouseEvent,
  type KeyEvent,
  AnchorNode,
} from '@vectorial/whiteboard/scene'
import {
  BindingAnchor,
} from '@vectorial/whiteboard/nodes'
import {
  toSharedTypes,
} from '@vectorial/whiteboard/utils'
import type {
  HitResult,
  AnchorHitResult,
} from '../../types'
import {
  normalizeMouseEvent,
  getResetStyleChanges,
  getSelectedStyleChanges,
  setAnchorHandlerOnPath,
  createInteractGuard,
} from '../utils'
import {
  type StateMouseEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
} from '../types'


export enum SelectingEvent {
  Move = 'Move',
  Select = 'Select',
  InsertAnchor = 'InsertAnchor',
  Marquee = 'Marquee',
  Cancel = 'Cancel',
}

export enum SelectingAction {
  Entry = 'Selecting.Entry',
  Exit = 'Selecting.Exit',
  Move = 'Selecting.Move',
  Select = 'Selecting.Select',
  InsertAnchor = 'Selecting.InsertAnchor',
  Marquee = 'Selecting.Marquee',
}

export type SelectingActions = {
  [SelectingAction.Entry]: EventObject;
  [SelectingAction.Exit]: EventObject;
  [SelectingAction.Move]: StateMouseEvent<SelectingEvent.Move>;
  [SelectingAction.Select]: StateMouseEvent<SelectingEvent.Select>;
  [SelectingAction.InsertAnchor]: StateMouseEvent<SelectingEvent.InsertAnchor>;
  [SelectingAction.Marquee]: StateMouseEvent<SelectingEvent.Marquee>;
}

const selectingInteract = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      scene,
      anchorNodes,
      vectorPath,
      machine,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<SelectingActions> => {
        const {
          handlerHit,
          anchorHit,
          pathHit,
          isClickDown,
        } = normalizeMouseEvent({
          event,
          vectorPath,
          anchorNodes,
          viewportScale: scene.scale,
        })

        const hit: HitResult | undefined = handlerHit ?? anchorHit ?? pathHit

        if (isClickDown) {
          if (!hit) {
            return { type: SelectingEvent.Marquee, event }
          } else if (anchorHit ?? handlerHit) {
            return { type: SelectingEvent.Select, event, hit: anchorHit ?? handlerHit }
          } else if (pathHit) {
            return { type: SelectingEvent.InsertAnchor, event, hit: pathHit }
          }
        } else {
          return { type: SelectingEvent.Move, event, hit }
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
      tap(() => { machine?.send({ type: SelectingEvent.Cancel }) }),
    ).subscribe()
  },
})

export const selectingActions: StateActions<StateContext, SelectingActions> = {
  [SelectingAction.Entry]: selectingInteract.entry,
  [SelectingAction.Exit]: selectingInteract.exit,

  [SelectingAction.Move]: () => {
    // actually, execute with IndicatingAction.Hover
  },

  [SelectingAction.Select]: (context, stateEvent) => {
    const {
      indicativeAnchor,
      changes,
      anchorNodes,
      selected,
    } = context
    const { event, hit } = stateEvent
    const isMultiSelect = event.shiftKey

    const resetStyles = () => {
      changes.push(...getResetStyleChanges(anchorNodes))
    }

    if (!hit) {
      if (!isMultiSelect) resetStyles()
      return
    }

    changes.push([indicativeAnchor, undefined])

    match(hit)
      .with({ type: PathHitType.Anchor }, (hit) => {
        let anchors: AnchorHitResult[] = []
        const isSelected = anchorNodes.get(hit.point)!.style?.anchor === 'selected'
        context.dragBase = { ...hit.point.position }

        if (isSelected) {
          return
        }
        /**
         * for selectConfirming,
         * if not hit anchor, that means anchor is new appended to selected;
         * if hit an anchor, that means the anchor need be judge to unselect;
         */
        stateEvent.hit = undefined

        if (isMultiSelect) {
          anchors = selected.filter(({ type }) => type === PathHitType.Anchor)
          anchors.push(hit)
        } else {
          anchors = [hit]
        }

        selected.splice(0, selected.length, ...anchors)
      })


      .with({ type: PathHitType.InHandler }, (hit) => {
        context.dragBase = math.add(hit.point.position, hit.point.inHandler!)
        selected.splice(0, selected.length, hit)
      })

      .with({ type: PathHitType.OutHandler }, (hit) => {
        context.dragBase = math.add(hit.point.position, hit.point.outHandler!)
        selected.splice(0, selected.length, hit)
      })

      .otherwise(() => {})

    resetStyles()

    changes.push(...getSelectedStyleChanges(selected, anchorNodes))
  },

  [SelectingAction.InsertAnchor]: (context, { hit }: StateMouseEvent) => {
    const {
      scene,
      vectorNode,
      anchorNodes,
      vectorPath,
      indicativePath,
      selected,
      changes,
    } = context

    if (hit?.type !== PathHitType.Path) return

    scene.docTransact(() => {
      const anchorData = hit.point.serialize()
      const vectorAnchor = BindingAnchor.from(
        anchorData,
        {
          binding: toSharedTypes(anchorData),
          redraw: vectorPath.redraw,
        },
      )

      const anchorNode = new AnchorNode({
        vectorAnchor: vectorAnchor,
        absoluteTransform: vectorNode.absoluteTransform,
        viewMatrix$: scene.events.viewMatrix$,
      })
      anchorNodes.set(vectorAnchor, anchorNode)

      setAnchorHandlerOnPath({
        ...hit,
        point: vectorAnchor,
      })

      vectorPath.addAnchorAt([vectorAnchor], hit.curveIndex + 1)
      indicativePath.path.anchors = [
        hit.ends[0],
        vectorAnchor,
        hit.ends[1],
      ]

      context.dragBase = { ...hit.point.position }

      selected.splice(0, selected.length, {
        ...hit,
        type: PathHitType.Anchor,
        point: vectorAnchor,
        anchorIndex: hit.curveIndex + 1,
      })
    })
    changes.push(
      [indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }],
      ...getResetStyleChanges(anchorNodes),
      ...getSelectedStyleChanges(selected, anchorNodes),
    )
  },

  [SelectingAction.Marquee]: (context, event) => {
    selectingActions[SelectingAction.Select](context, {
      ...event,
      type: SelectingEvent.Select,
    })
  },
}
