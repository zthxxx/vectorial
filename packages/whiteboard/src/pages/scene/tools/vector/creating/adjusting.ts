import {
  of,
  iif,
  map,
  EMPTY,
} from 'rxjs'
import {
  tap,
  filter,
  mergeMap,
} from 'rxjs/operators'
import {
  HandlerType,
  sub,
} from 'vectorial'
import {
  toSharedTypes,
} from '@vectorial/whiteboard/utils'
import {
  AnchorNode,
} from '@vectorial/whiteboard/scene/plugins'
import type {
  StateMouseEvent,
  StateKeyEvent,
  StateAction,
  MouseEvent,
  KeyEvent,
  GuardAction,
} from '../types'
import {
  normalizeMouseEvent,
} from '../utils'


export const enterAdjustOrCondition: GuardAction = (interactEvent$, context) => {
  const {
    machine,
  } = context

  interactEvent$.pipe(
    filter(event => Boolean(event.mouse)),
    mergeMap((event: MouseEvent) => {
      const { isMove, isDrag, isClickUp } = normalizeMouseEvent(event)

      return iif(
        () => isMove && isDrag,
        of<StateMouseEvent>({ type: 'move', event }),
        iif(
          () => isClickUp,
          of<StateMouseEvent>({ type: 'release', event }),
          EMPTY,
        )
      )
    }),
    tap((event: StateMouseEvent) => { machine?.send(event) }),
  ).subscribe()

  interactEvent$.pipe(
    filter(event => Boolean(event.key)),
    map((event: KeyEvent) => ({ type: 'move', event })),
    tap((event: StateKeyEvent) => { machine?.send(event) }),
  ).subscribe()
}

export const adjustingMove: StateAction = ({
  indicativeAnchor,
  indicativePath,
  vectorPath,
  creatingBase,
  changes,
}, { event }: StateMouseEvent | StateKeyEvent) => {
  const anchor = indicativeAnchor.vectorAnchor
  if (event.match({ modifiers: ['Alt'] })) {
    anchor.handlerType = HandlerType.Free
  } else {
    anchor.handlerType = HandlerType.Mirror
  }

  anchor.outHandler = sub(event.lastMouse!, anchor.position)

  changes.push([indicativeAnchor, { anchor: 'selected', inHandler: 'normal', outHandler: 'normal' }])
  const isReverse = creatingBase !== vectorPath.anchors.at(-1)
  indicativePath.path.anchors = isReverse
    ? [anchor, creatingBase]
    : [creatingBase, anchor]

  changes.push([indicativePath, { strokeWidth: 2, strokeColor: 0x18a0fb }])
}

/**
 * really create a new anchor
 */
export const adjustingRelease: StateAction = (context) => {
  const {
    scene,
    vectorNode,
    vectorPath,
    anchorNodes,
    indicativeAnchor,
    indicativePath,
    creatingBase,
    changes,
  } = context

  const isReverse = creatingBase !== vectorPath.anchors.at(-1)

  const vectorAnchor = indicativeAnchor.vectorAnchor.clone()
  const anchorNode = new AnchorNode({
    vectorAnchor,
    absoluteTransform: vectorNode.absoluteTransform,
    viewMatrix$: scene.events.viewMatrix$,
  })
  const anchors = vectorNode.binding.get('path')!.get('anchors')!
  if (isReverse) {
    vectorPath.addAnchorAt(vectorAnchor, 0)
    anchors.unshift([toSharedTypes(vectorAnchor.serialize())])
  } else {
    vectorPath.addAnchor(vectorAnchor)
    anchors.push([toSharedTypes(vectorAnchor.serialize())])
  }
  anchorNodes.set(vectorAnchor, anchorNode)

  context.creatingBase = vectorAnchor
  changes.push([anchorNode, { anchor: 'selected', inHandler: 'normal', outHandler: 'normal' }])

  changes.push([indicativeAnchor, undefined])
  changes.push([indicativePath, undefined])
  context.dragBase = undefined
}
