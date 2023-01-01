import {
  of,
  defer,
  EMPTY,
} from 'rxjs'
import {
  tap,
  filter,
  mergeMap,
} from 'rxjs/operators'
import { match } from 'ts-pattern'
import {
  HandlerType,
  sub,
  add,
  PathHitType,
  HitResult,
  VectorAnchor,
  AnchorHitResult,
} from 'vectorial'
import {
  assignMap,
} from '@vectorial/whiteboard/utils'
import type {
  MouseEvent,
  StateMouseEvent,
  StateAction,
  GuardAction,
} from '../types'
import {
  normalizeMouseEvent,
} from '../utils'


export const enterAdjusting: GuardAction = (interactEvent$, context) => {
  const {
    vectorPath,
    machine,
  } = context
  interactEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => defer(() => {
      const { isDrag, isClickUp } = normalizeMouseEvent(event, vectorPath)

      if (isDrag) {
        return of<StateMouseEvent>({ type: 'adjust', event })
      } else if (isClickUp) {
        return of<StateMouseEvent>({ type: 'done', event })
      } else {
        return EMPTY
      }
    })),
    tap((event: StateMouseEvent) => { machine?.send(event) }),
  ).subscribe()
}

export const adjustingAdjust: StateAction = (context, { event }: StateMouseEvent) => {
  const {
    scene,
    vectorNode,
    anchorNodes,
    indicativeAnchor,
    indicativePath,
    selected,
    dragBase,
    changes,
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
        if (event.metaKey || event.altKey) {
          const hitAnchor = selected.find(({ point }) => (
            point!.position.x === dragBase.x
            && point!.position.y === dragBase.y
          )) as AnchorHitResult
          if (hitAnchor) {
            changeHandlerType(hitAnchor.point)
            selected.splice(0, selected.length, {
              ...hitAnchor,
              type: PathHitType.OutHandler,
            } as HitResult)

            changes.push([anchorNode, { anchor: 'normal', outHandler: 'selected' }])
            anchors.get(hitAnchor.anchorIndex).set('handlerType', hitAnchor.point.handlerType)
          }
          return
        }
        const delta = sub(event.mouse, dragBase)
        selected.forEach(({ point, anchorIndex }: AnchorHitResult) => {
          const anchorNode = anchorNodes.get(point)!
          point.position = add(point.position, delta)
          changes.push([anchorNode, {}])
          assignMap(anchors.get(anchorIndex), { position: point.position })
        })
      })

      .with({ type: PathHitType.InHandler }, (hitResult) => {
        changeHandlerType(anchor)
        anchor.inHandler = sub(event.mouse, anchor.position)
        changes.push([anchorNode, {}])
        assignMap(anchors.get(hitResult.anchorIndex), {
          inHandler: anchor.inHandler,
          outHandler: anchor.outHandler,
          handlerType: anchor.handlerType,
        })
      })

      .with({ type: PathHitType.OutHandler }, (hitResult) => {
        changeHandlerType(anchor)
        anchor.outHandler = sub(event.mouse, anchor.position)
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
}
