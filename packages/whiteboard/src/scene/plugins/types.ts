import { User } from '@vectorial/whiteboard/model'
import type { Scene } from '../scene'


export interface ScenePluginProps {
  user: User;
  scene: Scene;
  isActive?: boolean;
}

export abstract class ScenePlugin {
  declare public name: string
  public scene: Scene
  public isActive: boolean

  constructor(props: ScenePluginProps) {
    const {
      scene,
      isActive = false,
    } = props
    this.scene = scene
    this.isActive = isActive
  }

  public activate(): void {
    this.isActive = true
  }

  public deactivate(): void {
    this.isActive = false
  }
}
