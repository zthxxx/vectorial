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
  VectorAnchor,
  HandlerType,
  math,
  AnchorHitResult,
  type Vector,
} from 'vectorial'
import {
  type MouseEvent,
} from '@vectorial/whiteboard/scene'
import {
  assignMap,
} from '@vectorial/whiteboard/utils'
import {
  createInteractGuard,
  normalizeMouseEvent,
} from '../utils'
import {
  type StateMouseEvent,
  type StateContext,
  type StateActions,
  type StateEvents,
} from '../types'


export enum AdjustingEditEvent {
  Adjust = 'Adjust',
  Done = 'Done',
}

export enum AdjustingEditAction {
  Entry = 'AdjustingEdit.Entry',
  Exit = 'AdjustingEdit.Exit',
  Adjust = 'AdjustingEdit.Adjust',
  Done = 'AdjustingEdit.Done',
}

export type AdjustingActions = {
  [AdjustingEditAction.Entry]: EventObject;
  [AdjustingEditAction.Exit]: EventObject;
  [AdjustingEditAction.Adjust]: StateMouseEvent<AdjustingEditEvent.Adjust>;
}

const adjustingInteract = createInteractGuard<StateContext>({
  entry: (context, { interact$ }) => {
    const {
      vectorPath,
      machine,
    } = context

    interact$.pipe(
      filter(event => Boolean(event.mouse)),
      map((event: MouseEvent): StateEvents<AdjustingActions> => {
        const { isDrag, isClickUp } = normalizeMouseEvent(event, vectorPath)

        if (isDrag) {
          return { type: AdjustingEditEvent.Adjust, event }
        } else if (isClickUp) {
          return { type: AdjustingEditEvent.Done }
        }
      }),
      tap((event) => { event && machine?.send(event) }),
    ).subscribe()
  },
})

export const adjustingEditActions: StateActions<StateContext, AdjustingActions> = {
  [AdjustingEditAction.Entry]: adjustingInteract.entry,
  [AdjustingEditAction.Exit]: adjustingInteract.exit,

  [AdjustingEditAction.Adjust]: (context, { event }) => {
    const {
      scene,
      vectorNode,
      anchorNodes,
      indicativeAnchor,
      indicativePath,
      selected,
      dragBase,
      changes,
      vectorPath,
    } = context
    if (!selected.length || !dragBase) return

    changes.push([indicativeAnchor, undefined])
    changes.push([indicativePath, undefined])

    const hitResult = selected[0]
    const anchor = hitResult.point!
    const anchorNode = anchorNodes.get(anchor)!
    const changeHandlerType = (anchor: VectorAnchor) => {
      if (event.match({ modifiers: ['Alt'] })) {
        anchor.handlerType = HandlerType.Free
      } else if (event.match({ modifiers: ['Meta'] })) {
        anchor.handlerType = HandlerType.Mirror
      }
    }

    const anchors = vectorNode.binding.get('path')!.get('anchors')!

    scene.docTransact(() => {
      match(hitResult)
        .with({ type: PathHitType.Anchor }, () => {
          // re-toggle handler
          if (event.metaKey || event.altKey) {
            const hitAnchor = selected.find(({ point }) => (
              point!.position.x === dragBase.x
              && point!.position.y === dragBase.y
            )) as AnchorHitResult
            if (!hitAnchor) return

            const size = vectorPath.anchors.length

            const lastAnchorPosition = (hitAnchor.anchorIndex === 0 && !vectorPath.closed)
              ? hitAnchor.point.position
              : vectorPath.anchors.at(hitAnchor.anchorIndex - 1)!.position

            const nextAnchorPosition = (
              hitAnchor.anchorIndex === size - 1
              && !vectorPath.closed
            )
              ? hitAnchor.point.position
              : vectorPath.anchors[(hitAnchor.anchorIndex + 1) % size].position

            // side for toggle in/out handler
            const handlerSide = side({
              M: event.mouse,
              P: hitAnchor.point.position,
              C1: lastAnchorPosition,
              C2: nextAnchorPosition,
            })

            changeHandlerType(hitAnchor.point)

            selected.splice(0, selected.length, {
              ...hitAnchor,
              type: handlerSide,
            } as HitResult)

            changes.push([anchorNode, {
              anchor: 'normal',
              [handlerSide === PathHitType.InHandler ? 'inHandler' : 'outHandler']: 'selected',
            }])
            anchors.get(hitAnchor.anchorIndex).set('handlerType', hitAnchor.point.handlerType)

            return
          }

          // move anchor
          const delta = math.sub(event.mouse, dragBase)
          selected.forEach(({ point, anchorIndex }: AnchorHitResult) => {
            const anchorNode = anchorNodes.get(point)!
            point.position = math.add(point.position, delta)
            changes.push([anchorNode, {}])
            assignMap(anchors.get(anchorIndex), { position: point.position })
          })
        })

        .with({ type: PathHitType.InHandler }, (hitResult) => {
          changeHandlerType(anchor)
          anchor.inHandler = math.sub(event.mouse, anchor.position)
          changes.push([anchorNode, {}])
          assignMap(anchors.get(hitResult.anchorIndex), {
            inHandler: anchor.inHandler,
            outHandler: anchor.outHandler,
            handlerType: anchor.handlerType,
          })
        })

        .with({ type: PathHitType.OutHandler }, (hitResult) => {
          changeHandlerType(anchor)
          anchor.outHandler = math.sub(event.mouse, anchor.position)
          changes.push([anchorNode, {}])
          assignMap(anchors.get(hitResult.anchorIndex), {
            inHandler: anchor.inHandler,
            outHandler: anchor.outHandler,
            handlerType: anchor.handlerType,
          })
        })

        .otherwise(() => {})
    })

    context.dragBase = {
      x: event.mouse.x,
      y: event.mouse.y,
    }
  },
}

/**
 * judge point M is near to vector PC1 or PC2, via angular bisector
 *
 * @param M current mouse point
 * @param P anchor point
 * @param C1 last anchor point
 * @param C2 next anchor point
 */
const side = ({ M, P, C1, C2 }: {
  M: Vector,
  C1: Vector,
  C2: Vector,
  P: Vector,
}): PathHitType.InHandler | PathHitType.OutHandler => {
  const PC1 = math.sub(C1, P)
  const PC2 = math.sub(C2, P)
  const PM = math.sub(M, P)

  const dotMPC1 = math.dot(PM, PC1)
  const dotMPC2 = math.dot(PM, PC2)

  const projectionMPC1 = dotMPC1 === 0 ? 0 : dotMPC1 / math.len(PC1)
  const projectionMPC2 = dotMPC2 === 0 ? 0 : dotMPC2 / math.len(PC2)

  return projectionMPC1 > projectionMPC2
    ? PathHitType.InHandler
    : PathHitType.OutHandler
}

