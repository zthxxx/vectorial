import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { isEqual } from 'lodash-es'
import {
  BehaviorSubject,
  tap,
  filter,
} from 'rxjs'
import {
  Rect,
  getPointsFromRect,
  multiply,
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
  type ScenePluginProps,
} from '@vectorial/whiteboard/scene'
import {
  drawMarquee,
  drawBounds,
  getNodesBounds,
} from './draw'
import { AnchorNode } from './anchor'


declare module '@vectorial/whiteboard/scene/scene' {
  interface ScenePlugins {
    HighlightSelectedPlugin?: HighlightSelectedPlugin;
  }
}

export class HighlightSelectedPlugin extends ScenePlugin {
  public name = 'HighlightSelectedPlugin'
  /** select node path skeleton */
  protected selectLayer: Container
  /** boundary only for current one hovered node */
  protected hoverLayer: Graphics
  /** boundary for all for selected node */
  protected boundaryLayer: Graphics
  protected marqueeLayer: Graphics
  protected usersSelectLayer: Graphics
  protected usersBoundaryLayer: Graphics
  protected usersMarqueeLayer: Graphics

  /** [user color, user marquee rect] */
  protected usersMarquee$ = new BehaviorSubject<[Color, Rect][]>([])
  /** [user color, user select node ids] */
  protected usersSelected$ = new BehaviorSubject<[Color, string[]][]>([])
  protected hovered$ = new BehaviorSubject<string | undefined>(undefined)

  protected lastUsersMarquee: [Color, Rect][] = []
  protected lastUsersSelected: [Color, string[]][] = []

  constructor(props: ScenePluginProps) {
    super(props)
    this.isActive = true

    const { interactLayer, usersLayer, app } = this.scene

    AnchorNode.renderer = app.renderer

    this.selectLayer = new Container()
    this.hoverLayer = new Graphics()
    this.boundaryLayer = new Graphics()
    this.marqueeLayer = new Graphics()

    this.usersSelectLayer = new Graphics()
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
    this.scene.awareness.on('change', this.handleAwarenessChange)
  }


  public activate() {
    this.isActive = true
  }

  /**
   * but users's awareness is always active
   */
  public deactivate() {
    this.isActive = false

    this.selectLayer.removeChildren()
    this.hoverLayer.clear()
    this.boundaryLayer.clear()
  }

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
    const usersMarquee = this.usersMarquee$.value
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

  public drawHovered = () => {
    const { hovered, viewMatrix } = this.scene
    this.hoverLayer.clear()
    if (!hovered) return
    if ([
      NodeType.Frame, NodeType.Group,
      /** @TODO Vector and BooleanOperation node need to show highlight path */
      NodeType.Vector, NodeType.BooleanOperation,
    ].includes(hovered.type)) {
      const parent = this.scene.page.get(hovered.parent)
      drawBounds(
        this.hoverLayer,
        getPointsFromRect(
          hovered.bounds,
          multiply(viewMatrix, parent?.absoluteTransform),
        ),
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
    if (!nodes.length) return
    this.selectLayer.removeChildren()

    const bounds = getNodesBounds(nodes)
    drawBounds(
      this.boundaryLayer,
      getPointsFromRect(bounds, viewMatrix),
      currentUserColor,
      2,
    )
  }

  public drawUsersSelected = () => {
    const usersSelected = this.usersSelected$.value
    const { page } = this.scene

    this.usersSelectLayer.clear()
    usersSelected.forEach(([color, selected]) => {
      const { viewMatrix } = this.scene
      selected.map(id => page.get(id)!)
        .filter(Boolean)
        .forEach(node => {
          const bounds = getNodesBounds([node])
          drawBounds(
            this.usersSelectLayer,
            getPointsFromRect(bounds, viewMatrix),
            color as Color,
          )
        })
    })
  }

  private handleAwarenessChange = () => {
    const { usersMarquee$, usersSelected$ } = this
    const { page, awareness } = this.scene
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

    const usersSelected = updatedUsers
      .filter(([, user]) => user.selected?.length)
      .map(([uid, user]) => [
        getUidColor(uid),
        user.selected,
      ] as [Color, string[]])

    if (!isEqual(usersMarquee, usersMarquee$.value)) {
      usersMarquee$.next(usersMarquee)
    }

    if (!isEqual(usersSelected, usersSelected$.value)) {
      usersSelected$.next(usersSelected)
    }
  }

  public setupMarqueeHighlight() {
    const { usersMarquee$ } = this
    const { update } = this.scene
    const { marquee$ } = this.scene.events

    marquee$.pipe(
      tap(this.drawMarquee),
      tap(update),
    ).subscribe()

    usersMarquee$.pipe(
      tap(this.drawUsersMarquee),
      tap(update),
    ).subscribe()
  }

  public setupSelectionHighlight() {
    const { usersSelected$ } = this
    const { update } = this.scene
    const { selected$, hovered$ } = this.scene.events

    hovered$.pipe(
      filter(() => this.isActive),
      filter(hovered => !this.scene.selected.has(hovered!)),
      filter(hovered => hovered?.id !== this.hovered$.value),
      tap(hovered => this.hovered$.next(hovered?.id)),
    ).subscribe()


    this.hovered$.pipe(
      tap(this.drawHovered),
      tap(update),
    ).subscribe()


    selected$.pipe(
      filter(() => this.isActive),
      tap(this.drawSelected),
      tap(update),
    ).subscribe()

    usersSelected$.pipe(
      tap(this.drawUsersSelected),
      tap(update),
    ).subscribe()
  }


  public setupViewport() {
    const { viewMatrix$ } = this.scene.events
    viewMatrix$.pipe(
      tap(this.drawUsersMarquee),
      tap(this.drawUsersSelected),
      tap(this.drawMarquee),
      filter(() => this.isActive),
      tap(this.drawHovered),
      tap(this.drawSelected),
    ).subscribe()

    this.scene.page.binding.observeDeep(() => {
      this.drawUsersSelected()

      if (!this.isActive) return
      this.drawSelected()
    })
  }
}
