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
  type AnchorNode,
} from '@vectorial/whiteboard/scene'
import {
  type MouseEvent,
  type KeyEvent,
  type StateMouseEvent,
  type GuardAction,
  type StateAction,
  CreatingDirection,
} from '../types'
import {
  normalizeMouseEvent,
} from '../utils'
import { createDone } from './createdConfirming'


export const enterIndicating: GuardAction = (interactEvent$, context) => {
  const {
    anchorNodes,
    vectorPath,
    machine,
  } = context

  interactEvent$.pipe(
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

      const closeTarget = context.creatingDirection === CreatingDirection.Start
        ? vectorPath.anchors.at(-1)
        : vectorPath.anchors.at(0)

      if (isClickDown) {
        if (
          anchorHit
          && 'point' in anchorHit
          && anchorHit?.point === closeTarget
        ) {
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
          && 'point' in anchorHit
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

export const indicatingMove: StateAction = ({
  scene,
  indicativeAnchor,
  indicativePath,
  vectorPath,
  creatingDirection,
  changes,
}, { event }: StateMouseEvent) => {
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
}

export const indicatingCreate: StateAction = (context, { event }: StateMouseEvent) => {
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
}

export const hoverIndicate: StateAction = ({
  scene,
  vectorPath,
  indicativeAnchor,
  indicativePath,
  anchorNodes,
  changes,
}, { hit }: StateMouseEvent) => {
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
}

export const indicatingClosingHover: StateAction = ({
  scene,
  vectorPath,
  indicativeAnchor,
  indicativePath,
  creatingDirection,
  changes,
}, { hit }: StateMouseEvent) => {
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
}

export const indicatingClosePath: StateAction = (context, event, meta) => {
  const {
    vectorNode,
    vectorPath,
  } = context
  vectorPath.closed = true
  vectorNode.binding.get('path')!.set('closed', true)
  vectorNode.draw()
  createDone(context, event, meta)
}
