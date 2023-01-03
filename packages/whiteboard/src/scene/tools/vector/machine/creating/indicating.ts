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
  HitResult,
} from 'vectorial'
import {
  cursor,
} from '@vectorial/whiteboard/assets'
import {
  KeyTriggerType,
  type MouseEvent,
  type KeyEvent,
  type AnchorNode,
} from '@vectorial/whiteboard/scene'
import {
  createInteractGuard,
  normalizeMouseEvent,
} from '../utils'
import {
  type StateMouseEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
  CreatingDirection,
} from '../types'


export enum IndicatingEvent {
  Move = 'Move',
  Hover = 'Hover',
  ClosingHover = 'ClosingHover',
  CreateAnchor = 'CreateAnchor',
  ClosePath = 'ClosePath',
  Select = 'Select',
  InsertAnchor = 'InsertAnchor',
  Cancel = 'Cancel',
}

export enum IndicatingAction {
  Entry = 'Indicating.Entry',
  Exit = 'Indicating.Exit',
  Move = 'Indicating.Move',
  Hover = 'Indicating.Hover',
  ClosingHover = 'Indicating.ClosingHover',
  CreateAnchor = 'Indicating.CreateAnchor',
  ClosePath = 'Indicating.ClosePath',
  Select = 'Indicating.Select',
  InsertAnchor = 'Indicating.InsertAnchor',
}

export type IndicatingActions = {
  [IndicatingAction.Entry]: EventObject;
  [IndicatingAction.Exit]: EventObject;
  [IndicatingAction.Move]: StateMouseEvent<IndicatingEvent.Move>;
  [IndicatingAction.Hover]: StateMouseEvent<IndicatingEvent.Hover>;
  [IndicatingAction.ClosingHover]: StateMouseEvent<IndicatingEvent.ClosingHover>;
  [IndicatingAction.CreateAnchor]: StateMouseEvent<IndicatingEvent.CreateAnchor>;
  [IndicatingAction.ClosePath]: StateMouseEvent<IndicatingEvent.ClosePath>;
  [IndicatingAction.Select]: StateMouseEvent<IndicatingEvent.Select>;
  [IndicatingAction.InsertAnchor]: StateMouseEvent<IndicatingEvent.InsertAnchor>;
}

const indicatingInteract = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      anchorNodes,
      vectorPath,
      machine,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<IndicatingActions> => {
        const {
          handlerHit,
          anchorHit,
          pathHit,
          isMove,
          isClickDown,
        } = normalizeMouseEvent(event, vectorPath, anchorNodes)
        const hit: HitResult | undefined = handlerHit ?? anchorHit ?? pathHit

        const closeTarget = context.creatingDirection === CreatingDirection.Start
          ? vectorPath.anchors.at(-1)
          : vectorPath.anchors.at(0)

        if (isClickDown) {
          if (
            anchorHit
            && 'point' in anchorHit
            && anchorHit?.point === closeTarget
          ) {
            return { type: IndicatingEvent.ClosePath, event, hit: anchorHit }
          } else if (anchorHit ?? handlerHit) {
            return { type: IndicatingEvent.Select, event, hit: anchorHit ?? handlerHit }
          } else if (pathHit) {
            return { type: IndicatingEvent.InsertAnchor, event, hit: pathHit }
          } else {
            return { type: IndicatingEvent.CreateAnchor, event }
          }
        } else if (isMove) {
          if (
            anchorHit
            && 'point' in anchorHit
            && anchorHit?.point === closeTarget
          ) {
            return { type: IndicatingEvent.ClosingHover, event, hit: anchorHit }
          } else if (hit) {
            return { type: IndicatingEvent.Hover, event, hit }
          } else {
            return { type: IndicatingEvent.Move, event }
          }
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
      tap(() => { machine?.send({ type: IndicatingEvent.Cancel }) }),
    ).subscribe()
  },
})

export const indicatingActions: StateActions<StateContext, IndicatingActions> = {
  [IndicatingAction.Entry]: indicatingInteract.entry,
  [IndicatingAction.Exit]: indicatingInteract.exit,

  [IndicatingAction.Move]: ({
    scene,
    indicativeAnchor,
    indicativePath,
    vectorPath,
    creatingDirection,
    changes,
  }, { event }) => {
    const { vectorAnchor } = indicativeAnchor
    scene.setCursor({ icon: cursor.pen })
    vectorAnchor.position = event.mouse
    vectorAnchor.inHandler = undefined
    vectorAnchor.outHandler = undefined

    changes.push([
      indicativeAnchor,
      { anchor: 'normal', inHandler: undefined, outHandler: undefined },
    ])

    indicativePath.path.anchors = match(creatingDirection)
      .with(CreatingDirection.Start, () => [vectorAnchor, vectorPath.anchors.at(0)])
      .with(CreatingDirection.End, () => [vectorPath.anchors.at(-1), vectorAnchor])
      .exhaustive()

    changes.push([indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }])
  },

  [IndicatingAction.Hover]: ({
    scene,
    vectorPath,
    indicativeAnchor,
    indicativePath,
    anchorNodes,
    changes,
  }, { hit }) => {
    scene.setCursor({ icon: cursor.arrow })

    if (!hit) {
      changes.push([indicativeAnchor, undefined])
      changes.push([indicativePath, undefined])
      return
    }

    indicativeAnchor.vectorAnchor = hit.point!.clone()

    match(hit)
      .with({ type: PathHitType.Anchor }, (hit) => {
        const isSelected = anchorNodes.get(hit.point)!.style?.anchor === 'selected'
        changes.push([indicativeAnchor, {
          anchor: isSelected ? 'selected' : 'highlight',
          inHandler: undefined,
          outHandler: undefined,
        }])

        changes.push([indicativePath, undefined])
      })

      .with({ type: PathHitType.InHandler }, (hit) => {
        const isSelected = anchorNodes.get(hit.point)!.style?.inHandler === 'selected'
        changes.push([indicativeAnchor, { inHandler: isSelected ? 'selected' : 'highlight' }])
        changes.push([indicativePath, undefined])
      })

      .with({ type: PathHitType.OutHandler }, (hit) => {
        const isSelected = anchorNodes.get(hit.point)!.style?.outHandler === 'selected'
        changes.push([indicativeAnchor, { outHandler: isSelected ? 'selected' : 'highlight' }])
        changes.push([indicativePath, undefined])
      })

      .with({ type: PathHitType.Path }, (hit) => {
        scene.setCursor({ icon: cursor.pen })
        indicativePath.path.anchors = hit.ends
        changes.push(
          [indicativeAnchor, { anchor: 'normal', inHandler: undefined, outHandler: undefined }],
          [indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }],
        )
      })

      .with({ type: PathHitType.Fill }, () => {
        indicativePath.path = vectorPath.clone()
        changes.push(
          [indicativeAnchor, { anchor: undefined, inHandler: undefined, outHandler: undefined }],
          [indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }],
        )
      })

      .exhaustive()
  },

  [IndicatingAction.ClosingHover]: ({
    scene,
    vectorPath,
    indicativeAnchor,
    indicativePath,
    creatingDirection,
    changes,
  }, { hit }) => {
    // hit will always be existed, code only for defense and type guard
    if (!hit || !('point' in hit)) return

    scene.setCursor({ icon: cursor.pen })
    indicativeAnchor.vectorAnchor = hit.point!.clone()

    const first = vectorPath.anchors.at(0)
    const last = vectorPath.anchors.at(-1)

    const closeTarget = creatingDirection === CreatingDirection.Start
      ? last
      : first

    changes.push([indicativeAnchor, { anchor: 'highlight', inHandler: undefined, outHandler: undefined }])
    // endpoint hover to indicate close path
    if (
      !vectorPath.closed
      && hit.point === closeTarget
      && vectorPath.anchors.length >= 2
    ) {
      indicativePath.path.anchors = [last, first]
      changes.push([indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }])
    } else {
      changes.push([indicativePath, undefined])
    }
  },

  [IndicatingAction.CreateAnchor]: (context, { event }: StateMouseEvent) => {
    const {
      indicativeAnchor,
      vectorPath,
      anchorNodes,
      changes,
      creatingDirection,
    } = context
    const { anchors } = vectorPath

    const pointStyle: AnchorNode['style'] = {
      anchor: 'normal',
      inHandler: undefined,
      outHandler: undefined
    }
    // keep origin in/out handler style
    const anchorStyle: AnchorNode['style'] = { anchor: 'normal' }

    match(creatingDirection)
      .with(CreatingDirection.Start, () => {
        changes.push(
          [anchorNodes.get(anchors.at(0)!), anchorStyle],
          [anchorNodes.get(anchors.at(1)!), pointStyle],
        )
      })
      .with(CreatingDirection.End, () => {
        changes.push(
          [anchorNodes.get(anchors.at(-1)!), anchorStyle],
          [anchorNodes.get(anchors.at(-2)!), pointStyle],
        )
      })
      .exhaustive()

    context.dragBase = {
      x: event.mouse.x,
      y: event.mouse.y,
    }
    const { vectorAnchor } = indicativeAnchor
    vectorAnchor.position = event.mouse
    vectorAnchor.inHandler = undefined
    vectorAnchor.outHandler = undefined
    changes.push([indicativeAnchor, { anchor: 'selected', inHandler: undefined, outHandler: undefined }])
  },

  [IndicatingAction.ClosePath]: (context, event) => {
    const {
      vectorNode,
      vectorPath,
    } = context
    vectorPath.closed = true
    vectorNode.binding.get('path')!.set('closed', true)
    vectorNode.draw()
  },

  [IndicatingAction.Select]: (context, event) => {
    // actually, exec `SelectingAction.Select`
  },

  [IndicatingAction.InsertAnchor]: (context, event) => {
    // actually, exec `SelectingAction.InsertAnchor`
  },
}
