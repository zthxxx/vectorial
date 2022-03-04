import { User } from '@vectorial/whiteboard/model'
import type { Scene } from '../scene'


export interface ScenePluginProps {
  user: User;
  scene: Scene;
}

export abstract class ScenePlugin {
  public abstract name: string
  public user: User
  public scene: Scene
  public isActive: boolean

  constructor(props: ScenePluginProps) {
    const {
      user,
      scene,
    } = props
    this.user = user
    this.scene = scene
    this.isActive = false
  }

  public activate(): void {
    this.isActive = true
  }

  public deactivate(): void {
    this.isActive = false
  }
}
