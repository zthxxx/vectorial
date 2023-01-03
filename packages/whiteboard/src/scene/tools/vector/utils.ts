import {
  add,
  sub,
  applyInverse,
  Matrix,
} from 'vectorial'
import {
  MouseTriggerType,
  type InteractEvent,
} from '@vectorial/whiteboard/scene'


export const applyToLocalEvent = (
  interactEvent: InteractEvent,
  transform: Matrix,
): InteractEvent => {
  const event = interactEvent.clone()
  event.key = interactEvent.key
  if (event.lastMouse) {
    event.lastMouse = applyInverse(event.lastMouse, transform)
  }
  if (
    interactEvent.mouse
    && interactEvent.mouse.type !== MouseTriggerType.Wheel
  ) {
    event.mouse = { ...interactEvent.mouse }
    const pos = applyInverse(event.mouse, transform)
    event.mouse.x = pos.x
    event.mouse.y = pos.y
  }

  if (event.dragging) {
    const { begin, offset } = event.dragging
    const start = applyInverse(begin, transform)
    const end = applyInverse(add(begin, offset), transform)
    const delta = sub(end, event.lastMouse!)
    event.dragging = {
      begin: start,
      offset: end,
      delta,
    }
  }

  return event
}
