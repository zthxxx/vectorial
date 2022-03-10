import {
  Subject,
} from 'rxjs'
import {
  takeUntil,
} from 'rxjs/operators'
import {
  Vector,
  Rect,
} from 'vectorial'
import {
  NodeType,
} from '@vectorial/whiteboard/model'
import {
  SceneNode,
  PageNode,
} from '@vectorial/whiteboard/nodes'
import {
  MouseTriggerType,
  MouseButton,
} from '@vectorial/whiteboard/scene'
import {
  getAncestors,
  orderNodes,
} from '@vectorial/whiteboard/utils'

import {
  MouseEvent,
  StateAction,
  GuardAction,
} from './types'

/**
 * scope node order: [bottom ... top]
 */
const getSelectedScope = (
  page: PageNode,
  selected: Set<SceneNode>,
): SceneNode[] => {
  const scope = new Set<SceneNode>()
  page.forEachChild(child => scope.add(child))

  selected.forEach(node => {
    scope.add(node)
    const ancestors = getAncestors(node, page) as (SceneNode | PageNode)[]
    ancestors.forEach(ancestor => {
      if (ancestor.type === NodeType.Page) return

      scope.add(ancestor)
      if ('children' in ancestor) {
        ancestor.forEachChild(child => scope.add(child))
      }
    })
  })

  const ordered = orderNodes(scope, page)
  return ordered
}

export const findHitPath = (
  page: PageNode,
  selected: Set<SceneNode>,
  point: Vector,
): SceneNode | undefined => {
  const scope = getSelectedScope(page, selected)
  for (const node of scope) {
    if (node.hitTest(point)) {
      return node
    }
  }
}

/**
 * scope node order: [top ... bottom]
 */
export const findMarqueeCover = (
  page: PageNode,
  selected: Set<SceneNode>,
  bounds: Rect,
): SceneNode[] => {
  const scope = getSelectedScope(page, selected)
  // covered order is [top ... bottom]
  const covered = scope.filter(node => node.coverTest(bounds)).reverse()
  const ancestors = new Set<SceneNode>()
  const result = []
  for (const node of covered) {
    const parent = page.get(node.parent)
    if (!ancestors.has(parent!)) {
      result.push(node)
    }
    ancestors.add(node)
  }
  return result
}

export const createEventGuard = (entry: GuardAction, exit?: StateAction): {
  entry: StateAction;
  exit: StateAction;
} => {
  const rests$ = new Subject<void>()

  return {
    entry: (context, ev) => {
      const { interactEvent$ } = context
      const event$ = interactEvent$.pipe(
        takeUntil(rests$),
      )
      entry(
        event$,
        context,
        ev,
      )
    },
    exit: (context, event, action) => {
      rests$.next()
      exit?.(context, event, action)
    },
  }
}

export const normalizeMouseEvent = (
  event: MouseEvent,
  page: PageNode,
  selected: Set<SceneNode>,
): {
  hit?: SceneNode;
  isMove: boolean;
  isClickDown: boolean;
  isClickUp: boolean;
  isDrag: boolean;
} => ({
  hit: findHitPath(page, selected, event.mouse),
  isMove: event.mouse.type == MouseTriggerType.Move,
  isClickDown: (
    event.mouse.type === MouseTriggerType.Down
    && event.match({ mouse: [MouseButton.Left] })
  ),
  isDrag: (
    Boolean(event.dragging)
    && event.match({ mouse: [MouseButton.Left] })
  ),
  isClickUp: (
    event.mouse.type === MouseTriggerType.Up
    && !event.downMouse.size
  ),
})
