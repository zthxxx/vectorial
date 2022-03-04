import {
  of,
  defer,
  EMPTY,
  ObservableInput,
} from 'rxjs'
import {
  tap,
  filter,
  mergeMap,
} from 'rxjs/operators'
import {
  PathHitType,
  HitResult,
} from 'vectorial'
import {
  icon,
} from '../../../assets'
import {
  DefaultPathColor,
} from '../../../nodes'
import {
  KeyTriggerType,
} from '../../event'
import type {
  MouseEvent,
  KeyEvent,
  StateMouseEvent,
  StateAction,
} from '../types'
import {
  setCanvasCursor,
  normalizeMouseEvent,
} from '../utils'
import { createDone } from './createdConfirming'


export const enterIndicating: StateAction = (context) => {
  const {
    interactionEvent$,
    subscription,
    anchorNodes,
    vectorPath,
    machine,
  } = context

  subscription.push(
    interactionEvent$.pipe(
      filter(event => Boolean(event.mouse)),
      mergeMap((event: MouseEvent) => defer<ObservableInput<StateMouseEvent>>(() => {
        const {
          handlerHit,
          anchorHit,
          pathHit,
          isMove,
          isClickDown,
        } = normalizeMouseEvent(event, vectorPath, anchorNodes)
        const hit: HitResult | undefined = handlerHit ?? anchorHit ?? pathHit
        const isReverse = context.creatingBase !== vectorPath.anchors.at(-1)
        const closeTarget = isReverse ? vectorPath.anchors.at(-1) : vectorPath.anchors.at(0)

        if (isClickDown) {
          if (anchorHit && anchorHit?.point === closeTarget) {
            return of({ type: 'closePath', event, hit: anchorHit })
          } else if (anchorHit ?? handlerHit) {
            return of({ type: 'select', event, hit: anchorHit ?? handlerHit })
          } else if (pathHit) {
            return of({ type: 'insertAnchor', event, hit: pathHit })
          } else {
            return of({ type: 'create', event })
          }
        } else if (isMove) {
          if (
            anchorHit
            && anchorHit?.point === closeTarget
          ) {
            return of({ type: 'closingHover', event, hit: anchorHit })
          } else if (hit) {
            return of({ type: 'hover', event, hit })
          } else {
            return of({ type: 'move', event })
          }
        }
        return EMPTY
      })),
      tap((event: StateMouseEvent) => { machine?.send(event) }),
    ).subscribe(),

    interactionEvent$.pipe(
      filter(event => Boolean(event.key)),
      filter((event: KeyEvent) => (
        event.key.type === KeyTriggerType.Up
        && event.match({ keys: [] })
        && event.key.trigger === 'Escape'
      )),
      tap(() => { machine?.send({ type: 'cancel' }) }),
    ).subscribe(),
  )
}

export const indicatingMove: StateAction = ({
  canvas,
  indicativeAnchor,
  indicativePath,
  vectorPath,
  creatingBase,
  changes,
}, { event }: StateMouseEvent) => {
  const { vectorAnchor } = indicativeAnchor
  setCanvasCursor(canvas, icon.pen)
  vectorAnchor.position = event.mouse
  vectorAnchor.inHandler = undefined
  vectorAnchor.outHandler = undefined

  changes.push([
    indicativeAnchor,
    { anchor: 'normal', inHandler: undefined, outHandler: undefined },
  ])

  const isReverse = creatingBase !== vectorPath.anchors.at(-1)
  indicativePath.path.anchors = isReverse
    ? [vectorAnchor, creatingBase]
    : [creatingBase, vectorAnchor]
  changes.push([indicativePath, { strokeWidth: 1, strokeColor: DefaultPathColor.highlight }])
}

export const indicatingCreate: StateAction = (context, { event }: StateMouseEvent) => {
  const {
    indicativeAnchor,
    vectorPath,
    anchorNodes,
    changes,
    creatingBase,
  } = context
  const { anchors } = vectorPath
  const isReverse = creatingBase !== anchors.at(-1)

  changes.push(
    [
      anchorNodes.get(anchors.at(isReverse ? 0 : -1)!),
      { anchor: 'normal' },
    ],
    [
      anchorNodes.get(anchors.at(isReverse ? 1 : -2)!),
      { anchor: 'normal', inHandler: undefined, outHandler: undefined },
    ],
  )

  context.dragBase = {
    x: event.mouse.x,
    y: event.mouse.y,
  }
  const { vectorAnchor } = indicativeAnchor
  vectorAnchor.position = event.mouse
  vectorAnchor.inHandler = undefined
  vectorAnchor.outHandler = undefined
  changes.push([indicativeAnchor, { anchor: 'selected', inHandler: undefined, outHandler: undefined }])
}

export const hoverIndicate: StateAction = ({
  canvas,
  vectorPath,
  indicativeAnchor,
  indicativePath,
  anchorNodes,
  changes,
}, { hit }: StateMouseEvent) => {
  setCanvasCursor(canvas)

  if (!hit) {
    changes.push([indicativeAnchor, undefined])
    changes.push([indicativePath, undefined])
    return
  }

  indicativeAnchor.vectorAnchor = hit.point.clone()

  switch (hit.type) {
    case (PathHitType.Anchor): {
      const isSelected = anchorNodes.get(hit.point)!.style?.anchor === 'selected'
      changes.push([indicativeAnchor, {
        anchor: isSelected ? 'selected' : 'highlight',
        inHandler: undefined,
        outHandler: undefined,
      }])

      changes.push([indicativePath, undefined])
      break
    }
    case (PathHitType.InHandler): {
      const isSelected = anchorNodes.get(hit.point)!.style?.inHandler === 'selected'
      changes.push([indicativeAnchor, { inHandler: isSelected ? 'selected' : 'highlight' }])
      changes.push([indicativePath, undefined])
      break
    }
    case (PathHitType.OutHandler): {
      const isSelected = anchorNodes.get(hit.point)!.style?.outHandler === 'selected'
      changes.push([indicativeAnchor, { outHandler: isSelected ? 'selected' : 'highlight' }])
      changes.push([indicativePath, undefined])
      break
    }
    case (PathHitType.Stroke): {
      setCanvasCursor(canvas, icon.pen)
      indicativePath.path.anchors = hit.ends
      changes.push(
        [indicativeAnchor, { anchor: 'normal', inHandler: undefined, outHandler: undefined }],
        [indicativePath, { strokeWidth: 1, strokeColor: DefaultPathColor.highlight }],
      )
      break
    }
    case (PathHitType.Fill): {
      indicativePath.path = vectorPath.clone()
      changes.push(
        [indicativeAnchor, { anchor: undefined, inHandler: undefined, outHandler: undefined }],
        [indicativePath, { strokeWidth: 2, strokeColor: DefaultPathColor.highlight }],
      )
      break
    }
  }
}

export const indicatingClosingHover: StateAction = ({
  canvas,
  vectorPath,
  indicativeAnchor,
  indicativePath,
  creatingBase,
  changes,
}, { hit }: StateMouseEvent) => {
  // hit will always be existed, code only for defense and type guard
  if (!hit) return

  setCanvasCursor(canvas)
  indicativeAnchor.vectorAnchor = hit.point.clone()

  const first = vectorPath.anchors.at(0)
  const last = vectorPath.anchors.at(-1)

  const isReverse = creatingBase !== last

  changes.push([indicativeAnchor, { anchor: 'highlight', inHandler: undefined, outHandler: undefined }])
  // endpoint hover to indicate close path
  if (
    !vectorPath.closed
    && hit.point === (isReverse ? last : first)
    && vectorPath.anchors.length >= 2
  ) {
    indicativePath.path.anchors = [last, first]
    changes.push([indicativePath, { strokeWidth: 1, strokeColor: DefaultPathColor.highlight }])
  } else {
    changes.push([indicativePath, undefined])
  }
}

export const indicatingClosePath: StateAction = (context, event, meta) => {
  const { vectorPath } = context
  vectorPath.closed = true
  createDone(context, event, meta)
}
