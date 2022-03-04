import { ReactElement } from 'react'
import {
  ScenePlugin,
  ScenePluginProps,
} from '@vectorial/whiteboard/scene'
import { AwareCursors } from './cursors'


declare module '@vectorial/whiteboard/scene/scene' {
  interface ScenePlugins {
    AwareCursorsPlugin?: AwareCursorsPlugin;
  }
}

export class AwareCursorsPlugin extends ScenePlugin {
  public name = 'AwareCursorsPlugin'

  constructor(props: ScenePluginProps) {
    super(props)
    this.isActive = true
  }

  /**
   * AwareCursorsPlugin is always active
   */
  public activate() {}
  public deactivate() {}

  public get cursors(): ReactElement {
    return (
      <AwareCursors
        pageId={this.scene.page.id}
        viewMatrix$={this.scene.events.viewMatrix$}
        interactEvent$={this.scene.events.interactEvent$}
      />
    )
  }
}
