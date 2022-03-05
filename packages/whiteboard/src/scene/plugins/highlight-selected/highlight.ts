import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { isEqual } from 'lodash-es'
import {
  tap,
  map,
} from 'rxjs/operators'
import {
  Rect,
  getPointsFromRect,
  multiply,
  Matrix,
  identityMatrix,
} from 'vectorial'
import {
  Color,
  getUidColor,
  currentUserColor,
  filterUserAwareness,
  NodeType,
} from '@vectorial/whiteboard/model'
import {
  ScenePlugin,
  ScenePluginProps,
} from '@vectorial/whiteboard/scene'
import {
  drawMarquee,
  drawBounds,
  getNodesBounds,
} from './draw'


declare module '@vectorial/whiteboard/scene/scene' {
  interface ScenePlugins {
    HighlightSelectedPlugin?: HighlightSelectedPlugin;
  }
}

export class HighlightSelectedPlugin extends ScenePlugin {
  public name = 'HighlightSelectedPlugin'
  protected selectLayer: Container
  protected hoverLayer: Graphics
  protected boundaryLayer: Graphics
  protected marqueeLayer: Graphics
  protected usersSelectLayer: Container
  protected usersBoundaryLayer: Graphics
  protected usersMarqueeLayer: Graphics
  protected lastViewMatrix: Matrix = identityMatrix()
  protected lastUsersMarquee: [Color, Rect][] = []
  protected lastUsersSelected: [Color, string[]][] = []

  constructor(props: ScenePluginProps) {
    super(props)
    this.isActive = true

    const { interactLayer, usersLayer } = this.scene

    this.selectLayer = new Container()
    this.hoverLayer = new Graphics()
    this.boundaryLayer = new Graphics()
    this.marqueeLayer = new Graphics()

    this.usersSelectLayer = new Container()
    this.usersBoundaryLayer = new Graphics()
    this.usersMarqueeLayer = new Graphics()

    interactLayer.addChild(
      this.selectLayer,
      this.hoverLayer,
      this.boundaryLayer,
      this.marqueeLayer,
    )

    usersLayer.addChild(
      this.usersSelectLayer,
      this.usersBoundaryLayer,
      this.usersMarqueeLayer,
    )

    this.setupMarqueeHighlight()
    this.setupSelectionHighlight()
    this.setupViewport()
  }

  /**
   * ViewportPlugin is always active
   */
  public activate() {}
  public deactivate() {}

  public drawMarquee = () => {
    const { marquee, viewMatrix } = this.scene
    this.marqueeLayer.clear()
    if (!marquee) return
    drawMarquee(
      this.marqueeLayer,
      currentUserColor,
      getPointsFromRect(marquee, viewMatrix),
    )
  }

  public drawUsersMarquee = () => {
    const { page, awareness, viewMatrix } = this.scene
    const updatedUsers = filterUserAwareness({
      awareness,
      pageId: page.id,
    })

    const usersMarquee = updatedUsers
      .filter(([, user]) => user.marquee)
      .map(([uid, user]) => [
        getUidColor(uid),
        user.marquee,
      ] as [Color, Rect])

    if (
      isEqual(this.lastUsersMarquee, usersMarquee)
      && isEqual(this.lastViewMatrix, viewMatrix)
    ) return
    this.lastUsersMarquee = usersMarquee

    this.usersMarqueeLayer.clear()
    usersMarquee.forEach(([color, marquee]) => {
      const { viewMatrix } = this.scene
      drawMarquee(
        this.usersMarqueeLayer,
        color,
        getPointsFromRect(marquee, viewMatrix),
      )
    })
  }

  public setupMarqueeHighlight() {
    const { awareness } = this.scene
    const { marquee$ } = this.scene.events

    marquee$.pipe(
      tap(this.drawMarquee),
    ).subscribe()

    awareness.on('change', this.drawUsersMarquee)
  }

  public drawHovered = () => {
    const { hovered, viewMatrix } = this.scene
    this.hoverLayer.clear()
    if (!hovered) return
    if ([NodeType.Frame, NodeType.Group].includes(hovered.type)) {
      drawBounds(
        this.hoverLayer,
        getPointsFromRect(hovered.bounds, multiply(viewMatrix, hovered.absoluteTransform)),
        currentUserColor,
        2,
      )
    }
  }

  public drawSelected = () => {
    const { selected, viewMatrix } = this.scene
    const nodes = [...selected]
      .filter(node => node && !node.removed)

    this.boundaryLayer.clear()
    this.selectLayer.removeChildren()
    const bounds = getNodesBounds(nodes)
    drawBounds(
      this.boundaryLayer,
      getPointsFromRect(bounds, viewMatrix),
      currentUserColor,
    )
  }

  public drawUsersSelected = (forceRefresh: boolean = false) => {
    const { page, awareness, viewMatrix } = this.scene
    const updatedUsers = filterUserAwareness({
      awareness,
      pageId: page.id,
    })

    const usersSelected = updatedUsers
      .filter(([, user]) => user.selected)
      .map(([uid, user]) => [
        getUidColor(uid),
        user.selected,
      ] as [Color, string[]])

    if (
      !forceRefresh
      && isEqual(this.lastUsersSelected, usersSelected)
      && isEqual(this.lastViewMatrix, viewMatrix)
    ) return
    this.lastUsersSelected = usersSelected

    this.usersMarqueeLayer.clear()
    usersSelected.forEach(([color, selected]) => {
      const { viewMatrix } = this.scene
      const nodes = selected.map(id => page.get(id)!)
      const bounds = getNodesBounds(nodes)
      drawBounds(
        this.usersMarqueeLayer,
        getPointsFromRect(bounds, viewMatrix),
        color as Color,
      )
    })
  }

  public setupSelectionHighlight() {
    const { awareness } = this.scene
    const { selected$, hovered$ } = this.scene.events

    hovered$.pipe(
      tap(this.drawHovered),
    ).subscribe()

    selected$.pipe(
      tap(this.drawSelected),
    ).subscribe()

    awareness.on('change', this.drawUsersSelected)
  }

  public setupViewport() {
    const { viewMatrix$ } = this.scene.events
    viewMatrix$.pipe(
      tap(this.drawMarquee),
      tap(this.drawHovered),
      tap(this.drawSelected),
      tap(this.drawUsersMarquee),
      tap(() => this.drawUsersSelected()),
      tap(viewMatrix => this.lastViewMatrix = viewMatrix),
    ).subscribe()

    this.scene.page.binding.observeDeep(() => {
      this.drawSelected()
      this.drawUsersSelected(true)
    })
  }
}
