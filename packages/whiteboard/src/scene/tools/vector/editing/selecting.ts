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
  add,
  PathHitType,
  HitResult,
} from 'vectorial'
import {
  KeyTriggerType,
  AnchorNode,
} from '@vectorial/whiteboard/scene'
import {
  assignMap, toSharedTypes,
} from '@vectorial/whiteboard/utils'
import type {
  MouseEvent,
  KeyEvent,
  StateMouseEvent,
  StateAction,
  GuardAction,
} from '../types'
import {
  normalizeMouseEvent,
  getResetStyleChanges,
  getSelectedStyleChanges,
  setAnchorHandlerOnPath,
} from '../utils'


export const enterSelecting: GuardAction = (interactEvent$, context) => {
  const {
    anchorNodes,
    vectorPath,
    machine,
  } = context

  interactEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => defer(() => {
      const {
        handlerHit,
        anchorHit,
        pathHit,
        isClickDown,
      } = normalizeMouseEvent(event, vectorPath, anchorNodes)

      const hit: HitResult | undefined = handlerHit ?? anchorHit ?? pathHit

      if (isClickDown) {
        if (!hit) {
          return of<StateMouseEvent>({ type: 'marquee', event })
        } else if (anchorHit ?? handlerHit) {
          return of<StateMouseEvent>({ type: 'select', event, hit: anchorHit ?? handlerHit })
        } else if (pathHit) {
          return of<StateMouseEvent>({ type: 'insertAnchor', event, hit: pathHit })
        } else {
          return EMPTY
        }
      } else {
        return of<StateMouseEvent>({ type: 'move', event, hit })
      }
    })),
    tap((event: StateMouseEvent) => { machine?.send(event) }),
  ).subscribe()


  interactEvent$.pipe(
    filter(event => Boolean(event.key)),
    filter((event: KeyEvent) => (
      event.key.type === KeyTriggerType.Up
      && event.match({ keys: [] })
      && event.key.trigger === 'Escape'
    )),
    tap(() => { machine?.send({ type: 'cancel' }) }),
  ).subscribe()
}

export const selectingSelect: StateAction = (context, stateEvent: StateMouseEvent) => {
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
      let anchors: HitResult[] = []
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
      context.dragBase = add(hit.point.position, hit.point.inHandler!)
      selected.splice(0, selected.length, hit)
    })

    .with({ type: PathHitType.OutHandler }, (hit) => {
      context.dragBase = add(hit.point.position, hit.point.outHandler!)
      selected.splice(0, selected.length, hit)
    })

    .otherwise(() => {})

  resetStyles()

  changes.push(...getSelectedStyleChanges(selected, anchorNodes))
}

/**
 * really change the anchors
 */
export const selectingInsertAnchor: StateAction = (context, { hit }: StateMouseEvent) => {
  const {
    scene,
    vectorNode,
    anchorNodes,
    vectorPath,
    selected,
    changes,
  } = context

  if (hit?.type !== PathHitType.Path) return

  scene.docTransact(() => {
    const len = vectorPath.anchors.length
    vectorPath.addAnchorAt(hit.point, hit.curveIndex + 1)
    const anchorNode = new AnchorNode({
      vectorAnchor: hit.point,
      absoluteTransform: vectorNode.absoluteTransform,
      viewMatrix$: scene.events.viewMatrix$,
    })
    anchorNodes.set(hit.point, anchorNode)

    setAnchorHandlerOnPath(hit)

    const anchors = vectorNode.binding.get('path')!.get('anchors')!

    assignMap(anchors.get(hit.curveIndex % len), hit.ends[0].serialize())
    assignMap(anchors.get((hit.curveIndex + 1) % len), hit.ends[1].serialize())
    anchors.insert(hit.curveIndex + 1, [toSharedTypes(hit.point.serialize())])
  })
  context.dragBase = { ...hit.point.position }

  selected.splice(0, selected.length, {
    ...hit,
    type: PathHitType.Anchor,
    anchorIndex: hit.curveIndex + 1,
  })
  changes.push(...getResetStyleChanges(anchorNodes))
  changes.push(...getSelectedStyleChanges(selected, anchorNodes))
}
